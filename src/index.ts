// Node modules.
import { mkdirp, writeFile } from 'fs-extra';
import { google } from 'googleapis';
import { XmlEntities } from 'html-entities';
// Local modules.
import CHANNEL_LIST from '../data/channels.json';

const entities = new XmlEntities();

const API_KEY = process.env.API_KEY;

const getVideos = async (channelId: string) => {
  const service = google.youtube('v3');
  const response = await service.search.list({
    auth: API_KEY,
    part: ['snippet'],
    channelId: channelId,
    maxResults: 10,
    order: 'date',
  });

  const videos = response.data.items;
  const results = videos?.map((video) => ({
    title: entities.decode(String(video.snippet?.title)),
    url: `https://www.youtube.com/watch?v=${video.id?.videoId}`,
    description: String(video.snippet?.description),
    publishedAt: String(video.snippet?.publishedAt),
    thumbnailUrl: String(video.snippet?.thumbnails?.high?.url),
    channelTitle: String(video.snippet?.channelTitle),
  }));

  return results;
}

const main = async () => {
  const outputPath = './artifacts';
  await mkdirp(outputPath);

  const channels: any[] = [];
  for await (const channel of CHANNEL_LIST) {
    const videos = await getVideos(channel.channelId);
    channels.push({
      name: channel.youtuberAlias,
      videos,
    });
  }

  await writeFile(`${outputPath}/channels.json`, JSON.stringify(channels));
};

main();
