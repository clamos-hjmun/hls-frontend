import React from "react";
import QueryProvider from "./QueryProvider";
import RouterProvider from "./RouterProvider";
import { useFsdDebug } from "@/6_shared/lib";
import { Loader } from "@/6_shared/ui";

export const MainProviders: React.FC = () => {
  useFsdDebug();

  return (
    <QueryProvider>
      <RouterProvider />
      <Loader />
    </QueryProvider>
  );
};
