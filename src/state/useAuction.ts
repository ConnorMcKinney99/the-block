import { useContext } from "react";
import { AuctionContext, type AuctionContextValue } from "./auctionContext";

export function useAuction(): AuctionContextValue {
  const context = useContext(AuctionContext);

  if (context === null) {
    throw new Error("useAuction must be used within an AuctionProvider.");
  }

  return context;
}
