import Banner from '../models/Banner';
// eslint-disable-next-line import/no-unresolved
import Meeting from '../models/Meeting';

class BannerController {
  async store(req, res) {
    const { id } = req.params;
    const existMeeting = await Meeting.findOne({
      where: { id },
    });

    if (!existMeeting) {
      return res.status(401).json({ error: 'This Meeting does not exist' });
    }

    const { originalname: name, filename: path } = req.file;

    const file = await Banner.create({
      name,
      path,
    });

    return res.json(file);
  }
}

export default new BannerController();
