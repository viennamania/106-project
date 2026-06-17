"use client";

import ReactDOM from "react-dom";

// Resource hints for the thirdweb wallet SDK origins. The wallet provider
// mounts on every route and opens connections to these origins early
// (~664ms into load, measured live); preconnecting runs DNS+TLS in parallel
// with the initial JS download. Per the Next 16 docs, ReactDOM.preconnect /
// prefetchDNS must run inside a Client Component to be inserted into <head>.
export function PreloadResources() {
  ReactDOM.preconnect("https://embedded-wallet.thirdweb.com");
  ReactDOM.preconnect("https://api.thirdweb.com", { crossOrigin: "anonymous" });
  ReactDOM.prefetchDNS("https://56.rpc.thirdweb.com");
  ReactDOM.prefetchDNS("https://c.thirdweb.com");

  return null;
}
