import { useState } from "react";
import { Button } from "@mui/material";

export const LiveBroadcast = () => {
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const handleSendTtsAndText = async () => {
        try {
            console.log("수동방송 시작");
        } catch (error) {
            console.error("An error occurred during combined request:", error);
            alert("전송처리 중 오류가 발생했습니다.");
        }
    };

    const handleStartManualBroadcast = () => {
        if (isBroadcasting) {
            alert("현재 방송 중입니다. 반복 클릭은 불필요합니다.");
            return;
        }

        const userConfirmed = window.confirm("수동방송을 시작하시겠습니까?");
        if (userConfirmed) {
            setIsBroadcasting(true);
            handleSendTtsAndText();

            setTimeout(() => {
                setIsBroadcasting(false);
            }, 20000);
        } else {
            console.log("수동방송을 취소합니다");
        }
    };

    return (
        <div
            style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#f1f1f1",
                padding: "20px",
            }}
        >
            <Button
                style={{
                    backgroundColor: isBroadcasting ? "#b0b0b0" : "#ee2b2b",
                    width: "100%",
                    fontWeight: 500,
                    fontSize: "24px",
                    color: "#fff",
                    borderRadius: "0",
                }}
                onClick={handleStartManualBroadcast}
            >
                방송 시작
            </Button>
        </div>
    );
};
