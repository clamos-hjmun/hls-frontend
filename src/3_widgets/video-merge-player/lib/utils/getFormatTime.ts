export const getFormatTime = (time: number): string => {
    // 60초 이상일 경우 분 단위로 변환
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    const formattedHours = hours.toString().padStart(2, "0");
    const formattedMinutes = minutes.toString().padStart(2, "0");
    const formattedSeconds = seconds.toString().padStart(2, "0");

    if (time === 0) {
        return "00:00";
    }

    if (hours > 0) {
        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    } else if (minutes > 0) {
        return `${formattedMinutes}:${formattedSeconds}`;
    } else {
        return `00:${formattedSeconds}`;
    }
};
