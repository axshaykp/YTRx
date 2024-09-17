import type {
  ActionFunction,
  ActionFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { Form, json, useActionData } from "@remix-run/react";
import { useState } from "react";

export const meta: MetaFunction = () => {
  return [{ title: "YTRx" }, { name: "description", content: "YTRx" }];
};

export const action: ActionFunction = async ({
  request,
}: ActionFunctionArgs) => {
  const form = await request.formData();
  const query = form.get("query");
  const response = await fetch(
    `https://www.youtube.com/results?search_query=${query}&sp=`,
    {
      method: "GET",
      headers: {
        Authority: "www.youtube.com",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.152 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    }
  );

  if (!response.ok) {
    throw new Response("Failed to fetch data", { status: response.status });
  }

  const htmlText = await response.text();

  const videoSections = htmlText.split('"videoId"');

  const videos: Video[] = [];
  const shorts: Video[] = [];
  const uniqueVideoIds = new Set<string>();

  videoSections.forEach((section) => {
    const videoIdMatch = /:"([^"]+)"/.exec(section);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (!videoId || uniqueVideoIds.has(videoId)) return;

    const thumbnailMatch = /https:\/\/i\.ytimg\.com\/vi\/[^"]+\.jpg/.exec(
      section
    );
    const thumbnailUrl = thumbnailMatch ? thumbnailMatch[0] : null;

    const titleMatch = /"title":{"runs":\[{"text":"([^"]+)"/.exec(section);
    const title = titleMatch ? titleMatch[1] : "Untitled";

    if (videoId && thumbnailUrl && title && videoId !== "youtube_web") {
      uniqueVideoIds.add(videoId);
      if (title === "Untitled") {
        shorts.push({
          videoId,
          img: thumbnailUrl,
          title,
        });
      } else {
        videos.push({
          videoId,
          img: thumbnailUrl,
          title,
        });
      }
    }
  });

  return json({ videos, shorts });
};

function decodeUnicodeSequences(input: string) {
  return input.replace(/\\u[\dA-F]{4}/gi, (match) => {
    return String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16));
  });
}

interface Video {
  videoId: string;
  title: string;
  img: string;
}

export default function Index() {
  const actionData = useActionData<typeof action>();
  const [active, setActive] = useState<"videos" | "shorts">("videos");

  return (
    <div className="p-5">
      <div className="flex flex-col sm:flex-row items-center gap-8 pb-5">
        <Form className="flex gap-3">
          <input
            className="h-11 rounded-md px-2 outline-none"
            type="text"
            name="query"
            placeholder="Search"
          />
          <button hidden className="" type="submit" formMethod="post">
            Search
          </button>
        </Form>
        <div className="flex items-center justify-center">
          <button
            className={`${
              active === "videos" ? "text-yellow-300" : "text-blue-800"
            } bg-white/50 border border-blue-900 px-5 py-2 rounded-l-md`}
            onClick={() => setActive("videos")}
          >
            Videos
          </button>
          <button
            className={`${
              active === "shorts" ? "text-yellow-300" : "text-blue-800"
            } bg-white/50 border border-blue-900 px-5 py-2 rounded-r-md`}
            onClick={() => setActive("shorts")}
          >
            Shorts
          </button>
        </div>
        <div className="ml-auto"></div>
      </div>
      <div
        className={`grid ${
          active === "videos"
            ? "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
        } gap-3`}
      >
        {actionData?.[active]?.map((video: Video, index: number) => (
          <a
            href={`mpv://https://www.youtube.com/watch?v=${video.videoId}`}
            className="text-wrap break-words text-white flex flex-col rounded-md shadow-md border border-transparent hover:border-blue-400 p-2"
            key={video.videoId + index}
          >
            <img
              className={`${
                active === "videos" ? "aspect-video" : "aspect-[5/9]"
              } object-cover rounded-t-md`}
              src={video.img}
              alt={decodeUnicodeSequences(video.title)}
            />
            <div className="relative overflow-hidden h-full">
              <img
                className={`${
                  active === "videos" ? "aspect-video rounded-b-md" : "aspect-[5/9] rounded-md"
                } object-cover absolute right-0 bottom-0 left-0 z-0`}
                src={video.img}
                alt={decodeUnicodeSequences(video.title)}
              />
              {active === "videos" && (
                <div className="px-5 py-4 rounded-b-md bg-gray-500 bg-clip-padding backdrop-filter  backdrop-blur bg-opacity-20 backdrop-saturate-100 backdrop-contrast-100 font-bold w-full h-full leading-normal flex items-end">
                  {decodeUnicodeSequences(video.title)}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
