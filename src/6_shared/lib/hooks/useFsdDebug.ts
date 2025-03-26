import { useEffect, useState } from "react";

export const useFsdDebug = () => {
    const [isEnabled, setIsEnabled] = useState<boolean>(() => {
        return process.env.NODE_ENV === "development" && localStorage.getItem("fsd-debug") === "true" ? true : false;
    });

    useEffect(() => {
        if (process.env.NODE_ENV !== "development") return;

        if (isEnabled) {
            document.body.classList.add("fsd-debug");
        } else {
            document.body.classList.remove("fsd-debug");
        }

        localStorage.setItem("fsd-debug", isEnabled.toString());
    }, [isEnabled]);

    useEffect(() => {
        if (process.env.NODE_ENV !== "development") return;

        const toggleFsdDebug = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.code === "KeyD") {
                event.preventDefault();
                setIsEnabled((prev) => !prev);
            }
        };

        window.addEventListener("keydown", toggleFsdDebug);
        return () => {
            window.removeEventListener("keydown", toggleFsdDebug);
        };
    }, []);

    return isEnabled;
};
