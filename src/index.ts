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
  // Solution ref: https://stackoverflow.com/a/27872244
  // UCoOY8_LHn6EBM25BN2_z0Ww => UUoOY8_LHn6EBM25BN2_z0Ww
  const playlistId = channelId.replace('UC', 'UU');
  const response = await service.playlistItems.list({
    auth: API_KEY,
    part: ['snippet'],
    playlistId,
    maxResults: 10,
  });

  const videos = response.data.items;
  const results = videos?.map((video) => ({
    title: entities.decode(String(video.snippet?.title)),
    url: `https://www.youtube.com/watch?v=${video.snippet?.resourceId?.videoId}`,
    description: String(video.snippet?.description),
    publishedAt: String(video.snippet?.publishedAt),
    thumbnailUrl: String(video.snippet?.thumbnails?.standard?.url),
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
