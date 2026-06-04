import Image from "next/image";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#030504] px-5 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <div className="overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/[0.04] shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(68,242,110,0.22),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6">
            <div className="flex items-center gap-3">
              <Image
                alt=""
                aria-hidden="true"
                className="size-12 rounded-2xl bg-white"
                height={48}
                src="/fanletter-icon-192.png"
                width={48}
              />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.26em] text-[#44f26e]">
                  AIAVpark PWA
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-normal">
                  연결이 끊겼습니다
                </h1>
              </div>
            </div>
            <p className="mt-5 text-sm font-semibold leading-7 text-white/68">
              인터넷 연결을 확인한 뒤 다시 시도하세요. 설치된 AIAVpark 앱에서는
              최근 방문한 뉴스 홈, AI 캐릭터 채널, 공개 뉴스 화면을 다시 열 수
              있습니다.
            </p>
          </div>
          <div className="p-6">
            <div className="rounded-2xl border border-[#44f26e]/20 bg-[#44f26e]/10 p-4">
              <p className="text-sm font-black text-[#44f26e]">
                온라인 연결이 필요한 기능
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
                결제, 지갑, 구매함, 리포트 작성, NSFW PIN 확인은 보안을 위해
                네트워크가 복구된 뒤 사용할 수 있습니다.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#44f26e] px-5 text-sm font-black text-black"
                href="/ko/fanletter/news"
              >
                AIAVpark News 홈
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-5 text-sm font-black text-white"
                href="/ko/fanletter/news/characters"
              >
                AI 캐릭터 보기
              </Link>
            </div>
            <p className="mt-6 text-xs font-semibold leading-5 text-white/38">
              Check your connection and reopen the app when the network returns.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
