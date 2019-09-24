import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import User from '../models/User';
import File from '../models/File';
import Banner from '../models/Banner';
import Meeting from '../models/Meeting';
import Notification from '../schemas/Notification';

// import CancellationMail from '../jobs/CancellationMail';
// import Queue from '../../lib/Queue';

class MeetingController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const meetings = await Meeting.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      attributes: [
        'id',
        'titulo',
        'descricao',
        'local',
        'date',
        'past',
        'cancelable',
      ],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
        {
          model: Banner,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });
    return res.json(meetings);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      titulo: Yup.string().required(),
      descricao: Yup.string().required(),
      local: Yup.string().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    // const meetingExists = await Meeting.findOne({
    //   where: { titulo: req.body.titulo, date: req.body.date },
    // });

    // if (meetingExists) {
    //   return res.status(400).json({
    //     error: 'A meeting with the same title and date already exist.',
    //   });
    // }

    const { titulo, descricao, local, date } = req.body;

    /**
     * Check if provider_id is a provider
     */

    /**
     * Check if user_id is equal to provider_id
     */

    /**
     * Check for past dates
     */
    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    /**
     * Check for date availability
     */

    const meeting = await Meeting.create({
      titulo,
      descricao,
      local,
      date,
      user_id: req.userId,
    });

    /**
     * Notify appointment provider
     */

    // const formattedDate = format(
    //   hourStart,
    //   "'dia' dd 'de' MMMM', às' H:mm'h'",
    //   { locale: pt }
    // );

    //   await Notification.create({
    //     content: `Meeting ${meeting.titulo} criada com sucesso para ${formattedDate}`,
    //   });

    return res.json(meeting);
  }

  async delete(req, res) {
    const meeting = await Meeting.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (meeting.user_id !== req.userId) {
      return res.status(401).json({
        error: 'You don´t have permission to cancel this meeting.',
      });
    }
    const { id } = req.params;
    const existMeeting = await Meeting.findOne({
      where: { id },
    });

    if (!existMeeting) {
      return res.status(401).json({ error: 'This meeting does not exist' });
    }

    const dateWithSub = subHours(meeting.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel meetings 2 hours in advance.',
      });
    }

    meeting.canceled_at = new Date();

    await meeting.save();

    // await Queue.add(CancellationMail.key, {
    //   meeting,
    // });

    return res.json(meeting);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      titulo: Yup.string(),
      descricao: Yup.string(),
      local: Yup.string(),
      date: Yup.date(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const meeting = await Meeting.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (meeting.user_id !== req.userId) {
      return res.status(401).json({
        error: 'You don´t have permission to update this meeting.',
      });
    }

    await meeting.update(req.body);

    const {
      id,
      titulo,
      descricao,
      local,
      date,
      banner,
    } = await Meeting.findByPk(req.params.id, {
      include: [
        {
          model: Banner,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    return res.json({
      id,
      titulo,
      descricao,
      local,
      date,
      banner,
    });
  }
}

export default new MeetingController();
