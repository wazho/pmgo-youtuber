// Node modules.
import { orderBy } from 'lodash';
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

  const videos = response.data.items || [];
  const results = videos.map((video) => ({
    title: entities.decode(String(video.snippet?.title)),
    url: `https://www.youtube.com/watch?v=${video.snippet?.resourceId?.videoId}`,
    description: String(video.snippet?.description),
    publishedAt: String(video.snippet?.publishedAt),
    thumbnailUrl: String(
      video.snippet?.thumbnails?.standard?.url ||
      video.snippet?.thumbnails?.high?.url ||
      video.snippet?.thumbnails?.default?.url
    ),
    channelTitle: String(video.snippet?.channelTitle),
  }));

  return results;
};

const getChannels = async (channelIds: string[]) => {
  const service = google.youtube('v3');
  const response = await service.channels.list({
    auth: API_KEY,
    part: ['snippet', 'statistics'],
    id: channelIds,
  });

  const channels = response.data.items || [];
  const results = await Promise.all(channels.map(async (channel) => ({
    id: channel.id!,
    title: String(channel.snippet?.title),
    thumbnailUrl: String(channel.snippet?.thumbnails?.default?.url),
    viewCount: parseInt(channel.statistics?.viewCount || '0'),
    subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
    videos: await getVideos(channel.id!),
  })));

  return results;
};

const main = async () => {
  const outputPath = './artifacts';
  await mkdirp(outputPath);

  let results;

  try {
    const channelIds = CHANNEL_LIST.map(({ channelId }) => channelId);
    const channelsRaw = await getChannels(channelIds);
    const channels = orderBy(channelsRaw, ['subscriberCount'], ['desc']);

    results = channels;
  } catch (e) {
    results = [];
  } finally {
    await writeFile(`${outputPath}/channels.json`, JSON.stringify(results, null, 2));
    await writeFile(`${outputPath}/channels.min.json`, JSON.stringify(results));
  }
};

main();
