import SpotifyWebApi from 'spotify-web-api-node';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

// 環境変数
dotenv.config({ path: 'config/.env' });

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("⚠️ SPOTIFY_CLIENT_ID または SPOTIFY_CLIENT_SECRET が設定されていません！");
  process.exit(1);
}

const spotifyApi = new SpotifyWebApi({
  clientId,
  clientSecret,
});

// ✅ 正しいももクロのアーティストID
const artistId = '3Zl0EsuYV23OgNw6WqGelN';

// ページング対応
async function getAllPages<T>(
  fetchFunction: (options: { limit: number; offset: number }) => Promise<{ body: { items: T[]; next: string | null } }>
): Promise<T[]> {
  let items: T[] = [];
  let offset = 0;
  const limit = 50;
  let response;

  do {
    response = await fetchFunction({ limit, offset });
    items = items.concat(response.body.items);
    offset += limit;
  } while (response.body.next);

  return items;
}

const getMomocloSongs = async () => {
  try {
    console.log("🎧 Spotifyに認証中...");
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    console.log("✅ 認証OK！");

    console.log("💿 アルバム情報を取得中...");
    const allAlbums = await getAllPages(options =>
      spotifyApi.getArtistAlbums(artistId, { ...options, include_groups: 'album,single' })
    );

    // 重複アルバム排除
    const uniqueAlbums = allAlbums.filter(
      (album, index, self) => index === self.findIndex((a) => a.name === album.name)
    );

    console.log(`✨ ${uniqueAlbums.length} 個のアルバムが見つかったよ！`);

    const allTracks: {
      id: string;
      album: string;
      releaseDate: string;
      track: string;
      trackNumber: number;
      durationMs: number;
      spotifyUrl: string;
    }[] = [];

    let counter = 1;

    for (const album of uniqueAlbums) {
      console.log(`🎶 アルバム「${album.name}」の曲を取得中...`);
      const tracks = await getAllPages(options => spotifyApi.getAlbumTracks(album.id, options));

      for (const track of tracks) {
        const customId = `MCZ${counter.toString().padStart(5, '0')}`;
        allTracks.push({
          id: customId,
          album: album.name,
          releaseDate: album.release_date,
          track: track.name,
          trackNumber: track.track_number,
          durationMs: track.duration_ms,
          spotifyUrl: track.external_urls?.spotify || '',
        });
        counter++;
      }
    }

    // ソート（アルバム名 → トラック番号）
    const sortedTracks = allTracks.sort((a, b) => {
      if (a.album === b.album) return a.trackNumber - b.trackNumber;
      return a.album.localeCompare(b.album);
    });

    // CSV出力
    const csvWriter = createObjectCsvWriter({
      path: path.resolve('./data/momoclo_songs.csv'),
      header: [
        { id: 'id', title: 'ID' },
        { id: 'album', title: 'Album' },
        { id: 'releaseDate', title: 'Release Date' },
        { id: 'trackNumber', title: 'Track Number' },
        { id: 'track', title: 'Track Name' },
        { id: 'durationMs', title: 'Duration (ms)' },
        { id: 'spotifyUrl', title: 'Spotify URL' },
      ],
      alwaysQuote: true,
    });

    await csvWriter.writeRecords(sortedTracks);

    console.log(`\n💾 CSVファイルを出力したよ！ => ${path.resolve('./data/momoclo_songs.csv')}`);
    console.log(`全部で ${sortedTracks.length} 曲だったよ🔥 モノノフ最高〜！`);

  } catch (err) {
    console.error('💥 エラー発生！', err);
  }
};

getMomocloSongs();
