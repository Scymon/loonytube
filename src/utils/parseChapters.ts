export type Chapter = { time: number; title: string };

/**
 * Parse YouTube-style chapter timestamps from a video description.
 * Matches lines like:  0:00 Intro   or   1:23:45 Act 2
 * Rules: at least 2 chapters, first must start at 0:00.
 */
export function parseChapters(description: string | null): Chapter[] {
  if (!description) return [];
  const re = /^(?:(\d+):)?(\d{1,2}):(\d{2})[ \t]+(.+)/gm;
  const chapters: Chapter[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(description)) !== null) {
    const hours = m[1] ? parseInt(m[1], 10) : 0;
    const mins  = parseInt(m[2], 10);
    const secs  = parseInt(m[3], 10);
    const title = m[4].trim();
    chapters.push({ time: hours * 3600 + mins * 60 + secs, title });
  }
  if (chapters.length < 2 || chapters[0].time !== 0) return [];
  return chapters;
}

/** Return the chapter that is active at the given playback time. */
export function chapterAt(chapters: Chapter[], currentTime: number): Chapter | null {
  let active: Chapter | null = null;
  for (const c of chapters) {
    if (currentTime >= c.time) active = c;
    else break;
  }
  return active;
}
