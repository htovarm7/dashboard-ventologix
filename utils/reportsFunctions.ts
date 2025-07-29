export const getColorCiclos = (value: number) => {
    if (value <= -10) return "text-blue-500";
    if (value < 0) return "text-green-600";
    if (value <= 10) return "text-yellow-500";
    return "text-red-600";
};

export const getColorHp = (value: number) => {
    if (value > 15) return "text-red-600";
    if (value > 5) return "text-yellow-500";
    if (value <= 0) return "text-green-600";
    return "";
};

export const getAnualValue = (value: number) => {
    return +(value * 52).toFixed(2);
};

export const getColorClass = (value: number) => {
    if (value >= 15) return "text-red-600";
    if (value >= 5) return "text-yellow-500";
    if (value <= 0) return "text-green-600";
    return "";
};

export const putBlur = (value: boolean) => {
    if (value) return "blur-sm";
    return "blur-none";
}