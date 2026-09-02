import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { InventoryPage } from "../features/inventory/InventoryPage";
import { MyBidsPage } from "../features/my-bids/MyBidsPage";
import { VehicleDetailPage } from "../features/vehicle/VehicleDetailPage";
import { AppLayout, RouteNotFound } from "./AppLayout";

const appRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <InventoryPage /> },
      { path: "/my-bids", element: <MyBidsPage /> },
      { path: "/vehicles/:vehicleId", element: <VehicleDetailPage /> },
      { path: "*", element: <RouteNotFound /> },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
