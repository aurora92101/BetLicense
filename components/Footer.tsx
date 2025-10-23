// components/Footer.tsx
import { FaTwitter, FaFacebookF, FaInstagram, FaLinkedin, FaTelegramPlane } from "react-icons/fa";
import { Button } from "./ui/button";

export default function Footer() {
  return (
    <footer
      className="
        text-gray-600 body-font
        /* 다크에서만 살짝 투명+블러 & 글자색 보정 */
        dark:text-[rgba(229,240,255,0.85)]
      "
    >
      {/* 상단 링크 영역 */}
      <div
        className="
          container px-5 py-24 mx-auto
          /* 라이트는 기존 유지, 다크에서만 글래스톤 */
          dark:bg-[rgba(12,18,28,0.75)] dark:border-y dark:border-white/10 dark:backdrop-blur-md
        "
      >
        <div className="flex flex-wrap md:text-left text-center -mb-10 -mx-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="lg:w-1/6 md:w-1/2 w-full px-4">
              <h2
                className="
                  title-font font-medium tracking-widest text-sm mb-3
                  text-gray-900 dark:text-[#E5F0FF]
                "
              >
                CATEGORIES
              </h2>
              <nav className="list-none mb-10">
                {["First Link", "Second Link", "Third Link", "Fourth Link"].map((label) => (
                  <li key={label}>
                    <a
                      className="
                        text-gray-600 hover:text-gray-800
                        dark:text-[rgba(229,240,255,0.75)]
                        dark:hover:text-[#b9d6ff]
                        transition-colors
                      "
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* 입력 + 소셜 영역 */}
      <div className="border-t border-gray-200 dark:border-white/10">
        <div
          className="
            container px-5 py-8 flex flex-wrap mx-auto items-center
            dark:bg-[rgba(12,18,28,0.80)] dark:backdrop-blur-md
          "
        >
          <div className="flex md:flex-nowrap flex-wrap justify-center items-end md:justify-start">
            <div className="relative sm:w-64 w-40 sm:mr-4 mr-2">
              <label
                htmlFor="footer-field"
                className="leading-7 text-sm text-gray-600 dark:text-[rgba(229,240,255,0.75)]"
              >
                Placeholder
              </label>
              <input
                type="text"
                id="footer-field"
                name="footer-field"
                className="
                  w-full bg-gray-100 bg-opacity-50 rounded border border-gray-300
                  text-base outline-none text-gray-700 py-1 px-3 leading-8
                  transition-colors duration-200 ease-in-out
                  focus:ring-2 focus:bg-transparent focus:ring-indigo-200 focus:border-indigo-500
                  /* 다크 전용: 투명+시안 포커스 */
                  dark:bg-[rgba(12,18,28,0.70)] dark:text-slate-100 dark:border-white/10
                  dark:placeholder:text-slate-400
                  dark:focus:ring-[rgba(85,182,255,0.60)] dark:focus:border-[rgba(85,182,255,0.60)]
                "
                placeholder="Your email"
              />
            </div>

            {/* 버튼: 라이트는 그대로, 다크에서만 시안 계열 */}
            <Button
              type="button"
              className="
                ml-2 rounded-full
                /* 다크 전용 시안 버튼 톤 */
                dark:bg-[rgba(106,208,255,0.20)] dark:text-[#6ad0ff]
                dark:border dark:border-[rgba(85,182,255,0.50)]
                dark:hover:bg-[rgba(85,182,255,0.50)]
                transition-colors
              "
            >
              Subscribe
            </Button>
          </div>

          {/* 소셜 아이콘 */}
          <span className="inline-flex lg:ml-auto lg:mt-0 mt-6 w-full justify-center md:justify-start md:w-auto">
            {[FaTwitter, FaFacebookF, FaInstagram, FaLinkedin].map((Icon, idx) => (
              <a
                key={idx}
                href="https://twitter.com/myhandle"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  text-gray-500 mx-2 transition-transform transition-colors duration-200 ease-in-out
                  hover:text-blue-500 hover:scale-110
                  /* 다크: 시안 계열 호버 */
                  dark:text-[rgba(229,240,255,0.65)]
                  dark:hover:text-[#6ad0ff]
                "
              >
                <Icon className="w-5 h-5" />
              </a>
            ))}
            <a
              href="https://t.me/+4BpoiVjGvz00ZDBl"
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-gray-500 mx-2 transition-transform transition-colors duration-200 ease-in-out
                hover:text-blue-500 hover:scale-110
                dark:text-[rgba(229,240,255,0.65)]
                dark:hover:text-[#6ad0ff]
              "
            >
              <FaTelegramPlane className="w-5 h-5" />
            </a>
          </span>
        </div>
      </div>

      {/* 저작권 바텀바 */}
      <div className="bg-gray-100 dark:bg-[rgba(10,15,25,0.90)] dark:border-t dark:border-white/10 dark:backdrop-blur-md">
        <div className="container mx-auto py-4 px-5 flex flex-wrap flex-col sm:flex-row">
          <p className="text-gray-500 dark:text-[rgba(229,240,255,0.75)] text-sm text-center sm:text-left">
            © 2025 BetFriend —
            <a
              href="https://twitter.com/knyttneve"
              className="text-gray-600 dark:text-[#b9d6ff] ml-1 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              @jupyter
            </a>
          </p>
          <span className="sm:ml-auto sm:mt-0 mt-2 sm:w-auto w-full sm:text-left text-center text-gray-500 dark:text-[rgba(229,240,255,0.65)] text-sm">
            Enamel pin tousled raclette tacos irony
          </span>
        </div>
      </div>
    </footer>
  );
}
