import Image from "next/image";

export default function AdminCard({
  imgHref,
  title,
  description,
}: {
  imgHref: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 md:w-1/3">
      <div
        className="
          h-full overflow-hidden rounded-lg border-2 border-gray-200 border-opacity-60
          bg-white shadow transition-all
          hover:shadow-lg

          /* 🌙 Dark-only glass + cyan tone */
          dark:border-white/10 dark:bg-[rgba(12,18,28,0.70)] dark:backdrop-blur
          dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)]
          dark:hover:bg-[rgba(255,255,255,0.06)]
        "
      >
        <Image
          className="w-full object-cover object-center md:h-36 lg:h-48"
          src={imgHref}
          alt={title}
          width={720}
          height={400}
        />
        <div className="p-6">
          <h2
            className="
              mb-1 text-xs font-medium tracking-widest text-gray-400
              dark:text-slate-300
            "
          >
            CATEGORY
          </h2>

          <h1
            className="
              mb-3 text-lg font-medium text-gray-900
              dark:text-slate-100
            "
          >
            {title}
          </h1>

          <p
            className="
              mb-3 leading-relaxed text-gray-700
              dark:text-slate-300
            "
          >
            {description}
          </p>

          <div className="flex flex-wrap items-center">
            {/* Learn More 링크 */}
            <a
              className="
                inline-flex items-center text-orange-600 hover:text-orange-700
                dark:text-[#6ad0ff] dark:hover:text-[#89dcff]
              "
            >
              Learn More
              <svg
                className="ml-2 h-4 w-4"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </a>

            {/* 뷰/댓글 카운트 */}
            <span
              className="
                ml-auto inline-flex items-center border-r-2 pr-3 py-1 text-sm leading-none text-gray-400
                border-gray-200
                dark:text-slate-400 dark:border-white/10
              "
            >
              <svg
                className="mr-1 h-4 w-4"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              1.2K
            </span>

            <span
              className="
                inline-flex items-center text-sm leading-none text-gray-400
                dark:text-slate-400
              "
            >
              <svg
                className="mr-1 h-4 w-4"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
              6
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
