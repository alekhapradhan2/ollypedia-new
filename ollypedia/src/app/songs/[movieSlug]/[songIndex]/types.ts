export interface SongData {
  title: string;
  ytId?: string;
  singer?: string;
  musicDirector?: string;
  lyricist?: string;
  lyrics?: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface MovieData {
  _id: string;
  title: string;
  slug: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  releaseDate?: string;
  genre?: string[];
  verdict?: string;
  language?: string;
  director?: string;
  imdbRating?: string | number;
  cast?: Array<{ name: string; role?: string; photo?: string; type?: string; castId?: string }>;
  media?: {
    songs?: SongData[];
    trailer?: { ytId?: string };
  };
}
