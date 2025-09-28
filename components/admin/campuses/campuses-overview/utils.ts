export function formatTeacherCount(count?: number) {
    if (typeof count !== "number") {
        return "Teacher metrics unavailable";
    }

    if (count === 0) {
        return "No teachers assigned yet";
    }

    if (count === 1) {
        return "1 teacher";
    }

    return `${count} teachers`;
}