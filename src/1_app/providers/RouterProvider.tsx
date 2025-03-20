import React from "react";
import { RouterProvider as ReactRouterProvider } from "react-router-dom";
import { AppRouter } from "@/1_app/routers";

const RouterProvider: React.FC = () => {
  return <ReactRouterProvider router={AppRouter} />;
};

export default RouterProvider;
