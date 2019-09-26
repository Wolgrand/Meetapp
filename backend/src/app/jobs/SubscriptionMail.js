import { format, parseISO } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Mail from '../../lib/Mail';

class SubscriptionMail {
  get key() {
    return 'SubscriptionMail';
  }

  async handle({ data }) {
    const { meeting_email } = data;

    await Mail.sendEmail({
      to: `${meeting_email.meeting.user.name} <${meeting_email.meeting.user.email}>`,
      subject: `Nova Inscrição no MeetApp ${meeting_email.meeting.titulo}`,
      template: 'subscription',
      context: {
        host: meeting_email.meeting.user.name,
        user: meeting_email.user.name,
        email: meeting_email.user.name,
        titulo: meeting_email.meeting.titulo,
      },
    });
  }
}

export default new SubscriptionMail();
