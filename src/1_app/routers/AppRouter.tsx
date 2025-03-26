import { createBrowserRouter } from "react-router-dom";
import { BaseLayout } from "@/1_app/layouts";
import { LoginPage } from "@/2_pages/login";
import { HomePage } from "@/2_pages/home";
import { VideoViewPage } from "@/2_pages/export/video-view";
import { ExportRequestPage } from "@/2_pages/export/export-request";
import { ExportStatusPage } from "@/2_pages/export/export-status";
import { ResourceRoomPage } from "@/2_pages/export/resource-room";
import { EquipmentStatusPage } from "@/2_pages/equipment/equipment-status";
import { PermissionSettingsPage } from "@/2_pages/org/permission-settings";
import { OrganizationSyncPage } from "@/2_pages/org/organization-sync";
import { EquipmentLogsPage } from "@/2_pages/logs/equipment-logs";
import { ExportLogsPage } from "@/2_pages/logs/export-logs";
import { AccessQueryLogsPage } from "@/2_pages/logs/access-query-logs";
import { SyncLogsPage } from "@/2_pages/logs/sync-logs";
import { VideoSettingsPage } from "@/2_pages/settings/video-settings";
import { UserInfoPage } from "@/2_pages/settings/user-info";
import { NotificationsPage } from "@/2_pages/settings/notifications";
import { NotFoundPage } from "@/2_pages/404";

export const AppRouter = createBrowserRouter([
    {
        element: <BaseLayout />,
        errorElement: <NotFoundPage />,
        children: [
            { path: "/", element: <HomePage /> },
            { path: "/login", element: <LoginPage /> },

            // 반출 관리
            {
                path: "/export",
                children: [
                    { path: "video-view", element: <VideoViewPage /> },
                    { path: "request", element: <ExportRequestPage /> },
                    { path: "status", element: <ExportStatusPage /> },
                    { path: "resource-room", element: <ResourceRoomPage /> },
                ],
            },

            // 장비 관리
            { path: "/equipment/status", element: <EquipmentStatusPage /> },

            // 조직 관리
            {
                path: "/org",
                children: [
                    { path: "permissions", element: <PermissionSettingsPage /> },
                    { path: "sync", element: <OrganizationSyncPage /> },
                ],
            },

            // 로그 관리
            {
                path: "/logs",
                children: [
                    { path: "equipment", element: <EquipmentLogsPage /> },
                    { path: "export", element: <ExportLogsPage /> },
                    { path: "access-query", element: <AccessQueryLogsPage /> },
                    { path: "sync", element: <SyncLogsPage /> },
                ],
            },

            // 환경 설정
            {
                path: "/settings",
                children: [
                    { path: "video", element: <VideoSettingsPage /> },
                    { path: "user", element: <UserInfoPage /> },
                    { path: "notifications", element: <NotificationsPage /> },
                ],
            },

            // 404 페이지 처리
            { path: "*", element: <NotFoundPage /> },
        ],
    },
]);
