import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import User from '../models/User';
import File from '../models/File';
import Banner from '../models/Banner';
import Subscription from '../models/Subscription';
import Notification from '../schemas/Notification';

import SubscriptionMail from '../jobs/SubscriptionMail';
import Queue from '../../lib/Queue';
import Meeting from '../models/Meeting';

class SubscriptionController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const subscriptions = await Subscription.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date', 'past', 'cancelable'],
      limit: 10,
      offset: (page - 1) * 100,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
        {
          model: Meeting,
          as: 'meeting',
          attributes: ['id', 'date', 'titulo', 'local', 'descricao'],
          include: [
            {
              model: Banner,
              as: 'banner',
              attributes: ['id', 'path', 'url'],
            },
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
      ],
    });
    return res.json(subscriptions);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      meeting_id: Yup.number(),
      date: Yup.date(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const meeting_id = req.params.id;
    const meeting = await Meeting.findByPk(meeting_id);

    /**
     * Check if meetup exist
     */
    const checkifMeetingExist = await Meeting.findOne({
      where: { id: meeting_id, canceled_at: null },
    });

    if (!checkifMeetingExist) {
      return res
        .status(401)
        .json({ error: 'You can only subscribe to existing Meetups' });
    }

    /**
     * Check if user is host
     */
    const checkIfUserIsHost = await Meeting.findOne({
      where: { id: meeting_id, canceled_at: null, user_id: req.userId },
    });

    if (checkIfUserIsHost) {
      return res
        .status(401)
        .json({ error: 'You can´t subscribe to meetups created by yourself' });
    }
    /**
     * Check for past dates
     */
    const { date } = meeting;

    if (isBefore(date, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    // /**
    //  * Check for duplicate subscription
    //  */

    const checkIfAlreadySubscribed = await Subscription.findOne({
      where: {
        meeting_id,
        user_id: req.userId,
        canceled_at: null,
      },
    });

    if (checkIfAlreadySubscribed) {
      return res.status(400).json({ error: 'You are already subscribed' });
    }

    // /**
    //  * Check for subscription in two meetups at same time
    //  */

    const checkSameTime = await Subscription.findOne({
      where: {
        user_id: req.userId,
        date,
        canceled_at: null,
      },
    });

    if (checkSameTime) {
      return res.status(400).json({
        error: 'You are already subscribed at another meetup at the same time',
      });
    }

    const subscription = await Subscription.create({
      date: meeting.date,
      user_id: req.userId,
      meeting_id,
    });

    const meeting_email = await Subscription.findOne({
      where: {
        meeting_id,
        user_id: req.userId,
        canceled_at: null,
      },

      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
        {
          model: Meeting,
          as: 'meeting',
          attributes: ['id', 'date', 'titulo', 'local', 'descricao'],
          include: [
            {
              model: Banner,
              as: 'banner',
              attributes: ['id', 'path', 'url'],
            },
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
      ],
    });

    await Queue.add(SubscriptionMail.key, {
      meeting_email,
    });

    /**
     * Notify appointment provider
     */
    // const user = await User.findByPk(req.userId);
    // const formattedDate = format(
    //   hourStart,
    //   "'dia' dd 'de' MMMM', às' H:mm'h'",
    //   { locale: pt }
    // );

    // await Notification.create({
    //   content: `Novo agendamento de ${user.name} para ${formattedDate}`,
    //   user: provider_id,
    // });

    return res.json(subscription);
  }

  async delete(req, res) {
    const meeting = await Meeting.findByPk(req.params.id);

    const subscription = await Subscription.findOne({
      where: { meeting_id: meeting.id, canceled_at: null },
    });

    if (subscription.user_id !== req.userId) {
      return res.status(401).json({
        error: 'You don´t have permission to cancel this subscription.',
      });
    }

    // const dateWithSub = subHours(appointment.date, 2);

    // if (isBefore(dateWithSub, new Date())) {
    //   return res.status(401).json({
    //     error: 'You can only cancel appointments 2 hours in advance.',
    //   });
    // }

    subscription.canceled_at = new Date();

    await subscription.save();

    // await Queue.add(CancellationMail.key, {
    //   appointment,
    // });

    return res.json(subscription);
  }
}

export default new SubscriptionController();
