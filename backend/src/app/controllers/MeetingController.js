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
      attributes: ['id', 'date', 'past', 'cancelable'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'host',
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
      date: Yup.date().required(),
      descricao: Yup.text().required(),
      local: Yup.string().required(),
      titulo: Yup.string().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { date, descricao, local, titulo } = req.body;

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
      user_id: req.userId,
      descricao,
      local,
      date,
      titulo,
    });

    /**
     * Notify appointment provider
     */

    const formattedDate = format(
      hourStart,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      { locale: pt }
    );

    await Notification.create({
      content: `Meeting ${meeting.titulo} criada com sucesso para ${formattedDate}`,
    });

    return res.json(meeting);
  }

  // async delete(req, res) {
  //   const appointment = await Appointment.findByPk(req.params.id, {
  //     include: [
  //       {
  //         model: User,
  //         as: 'provider',
  //         attributes: ['name', 'email'],
  //       },
  //       {
  //         model: User,
  //         as: 'user',
  //         attributes: ['name'],
  //       },
  //     ],
  //   });

  //   if (appointment.user_id !== req.userId) {
  //     return res.status(401).json({
  //       error: 'You don´t have permission to cancel this appointment.',
  //     });
  //   }

  //   const dateWithSub = subHours(appointment.date, 2);

  //   if (isBefore(dateWithSub, new Date())) {
  //     return res.status(401).json({
  //       error: 'You can only cancel appointments 2 hours in advance.',
  //     });
  //   }

  //   appointment.canceled_at = new Date();

  //   await appointment.save();

  //   await Queue.add(CancellationMail.key, {
  //     appointment,
  //   });

  //   return res.json(appointment);
  // }
}

export default new MeetingController();
