import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3ea_0%,#edf5ff_28%,#eaf8f4_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Offline Mode
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            오프라인 상태입니다.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            인터넷 연결을 확인한 뒤 다시 시도하세요. 설치된 앱에서는 최근
            방문한 정적 화면과 기본 셸은 계속 열 수 있지만, 회원 동기화와 지갑
            조회는 연결이 필요합니다.
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Check your connection and reopen the app when the network returns.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/ko"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white"
            >
              홈으로 돌아가기
            </Link>
            <Link
              href="/en"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
            >
              Open English Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
