import { supabase } from "../../lib/supabaseClient";

export type TaskStatus =
    | "Not Started"
    | "In Progress"
    | "Completed"
    | "Archived";

export async function getTasks() {
    return supabase
        .from("tasks")
        .select(
            `
      *,
      task_steps (*)
    `
        )
        .order("created_at", { ascending: false });
}

export async function createTask(input: {
    title: string;
    description?: string;
    points: number;
    status?: TaskStatus;
}) {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { data: null, error: userError ?? new Error("Not logged in") };
    }

    return supabase
        .from("tasks")
        .insert({
            user_id: user.id,
            title: input.title,
            description: input.description ?? "",
            points: input.points,
            status: input.status ?? "Not Started",
        })
        .select()
        .single();
}