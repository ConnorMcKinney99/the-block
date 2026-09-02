import { RouterProvider } from "react-router-dom";
import { AuctionProvider } from "../state/AuctionProvider";
import { router } from "./router";

export function App() {
  return (
    <AuctionProvider>
      <RouterProvider router={router} />
    </AuctionProvider>
  );
}
