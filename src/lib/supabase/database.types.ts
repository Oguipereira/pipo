// Gerado a partir do banco (npm run db:types). Não edite à mão.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string
          created_at: string
          id: string
          is_code: boolean
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_code?: boolean
          name: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_code?: boolean
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commit_languages: {
        Row: {
          additions: number
          commit_id: string
          deletions: number
          files: number
          language: string
          user_id: string
        }
        Insert: {
          additions?: number
          commit_id: string
          deletions?: number
          files?: number
          language: string
          user_id?: string
        }
        Update: {
          additions?: number
          commit_id?: string
          deletions?: number
          files?: number
          language?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commit_languages_commit_id_user_id_fkey"
            columns: ["commit_id", "user_id"]
            isOneToOne: false
            referencedRelation: "commits"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      commits: {
        Row: {
          additions: number
          committed_at: string
          created_at: string
          deletions: number
          files_fetched_at: string | null
          id: string
          local_date: string
          message: string
          repo_id: string
          sha: string
          url: string
          user_id: string
        }
        Insert: {
          additions?: number
          committed_at: string
          created_at?: string
          deletions?: number
          files_fetched_at?: string | null
          id?: string
          local_date: string
          message: string
          repo_id: string
          sha: string
          url: string
          user_id?: string
        }
        Update: {
          additions?: number
          committed_at?: string
          created_at?: string
          deletions?: number
          files_fetched_at?: string | null
          id?: string
          local_date?: string
          message?: string
          repo_id?: string
          sha?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commits_repo_id_user_id_fkey"
            columns: ["repo_id", "user_id"]
            isOneToOne: false
            referencedRelation: "repos"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      contribution_days: {
        Row: {
          count: number
          date: string
          level: number
          user_id: string
        }
        Insert: {
          count: number
          date: string
          level: number
          user_id?: string
        }
        Update: {
          count?: number
          date?: string
          level?: number
          user_id?: string
        }
        Relationships: []
      }
      dependencies: {
        Row: {
          ecosystem: string
          id: string
          is_dev: boolean
          manifest_path: string
          name: string
          repo_id: string
          user_id: string
          version: string | null
        }
        Insert: {
          ecosystem: string
          id?: string
          is_dev?: boolean
          manifest_path: string
          name: string
          repo_id: string
          user_id?: string
          version?: string | null
        }
        Update: {
          ecosystem?: string
          id?: string
          is_dev?: boolean
          manifest_path?: string
          name?: string
          repo_id?: string
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dependencies_repo_id_user_id_fkey"
            columns: ["repo_id", "user_id"]
            isOneToOne: false
            referencedRelation: "repos"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      event_exceptions: {
        Row: {
          date: string
          event_id: string
          user_id: string
        }
        Insert: {
          date: string
          event_id: string
          user_id?: string
        }
        Update: {
          date?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_exceptions_event_id_user_id_fkey"
            columns: ["event_id", "user_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      events: {
        Row: {
          category_id: string | null
          created_at: string
          date: string
          end_time: string | null
          id: string
          location: string | null
          notes: string | null
          project_id: string | null
          recurrence_days: number | null
          recurrence_until: string | null
          start_time: string | null
          task_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string | null
          recurrence_days?: number | null
          recurrence_until?: string | null
          start_time?: string | null
          task_id?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string | null
          recurrence_days?: number | null
          recurrence_until?: string | null
          start_time?: string | null
          task_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_user_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "events_project_id_user_id_fkey"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "events_task_id_user_id_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          created_at: string
          date: string
          habit_id: string
          id: string
          source: string
          target_snapshot: number | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          date: string
          habit_id: string
          id?: string
          source?: string
          target_snapshot?: number | null
          updated_at?: string
          user_id?: string
          value: number
        }
        Update: {
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
          source?: string
          target_snapshot?: number | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_user_id_fkey"
            columns: ["habit_id", "user_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      habits: {
        Row: {
          archived_at: string | null
          category_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["habit_kind"]
          name: string
          position: number
          schedule_days: number
          start_date: string
          target: number | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["habit_kind"]
          name: string
          position?: number
          schedule_days?: number
          start_date?: string
          target?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["habit_kind"]
          name?: string
          position?: number
          schedule_days?: number
          start_date?: string
          target?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_category_id_user_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      library_categories: {
        Row: {
          category: string
          ecosystem: string
          name: string
          user_id: string
        }
        Insert: {
          category: string
          ecosystem: string
          name: string
          user_id?: string
        }
        Update: {
          category?: string
          ecosystem?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          position: number
          project_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          position?: number
          project_id: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          position?: number
          project_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_user_id_fkey"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          github_id: number | null
          github_login: string | null
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          github_id?: number | null
          github_login?: string | null
          id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          github_id?: number | null
          github_login?: string | null
          id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_repos: {
        Row: {
          project_id: string
          repo_id: string
          user_id: string
        }
        Insert: {
          project_id: string
          repo_id: string
          user_id?: string
        }
        Update: {
          project_id?: string
          repo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_repos_project_id_user_id_fkey"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "project_repos_repo_id_user_id_fkey"
            columns: ["repo_id", "user_id"]
            isOneToOne: false
            referencedRelation: "repos"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      projects: {
        Row: {
          category_id: string | null
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category_id?: string | null
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_category_id_user_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      repo_languages: {
        Row: {
          bytes: number
          color: string | null
          language: string
          repo_id: string
          user_id: string
        }
        Insert: {
          bytes: number
          color?: string | null
          language: string
          repo_id: string
          user_id?: string
        }
        Update: {
          bytes?: number
          color?: string | null
          language?: string
          repo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repo_languages_repo_id_user_id_fkey"
            columns: ["repo_id", "user_id"]
            isOneToOne: false
            referencedRelation: "repos"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      repos: {
        Row: {
          commits_synced_at: string | null
          created_at: string
          default_branch: string | null
          deps_synced_at: string | null
          description: string | null
          full_name: string
          github_id: number
          id: string
          ignored: boolean
          is_archived: boolean
          is_fork: boolean
          is_private: boolean
          name: string
          owner: string
          primary_language: string | null
          pushed_at: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          commits_synced_at?: string | null
          created_at?: string
          default_branch?: string | null
          deps_synced_at?: string | null
          description?: string | null
          full_name: string
          github_id: number
          id?: string
          ignored?: boolean
          is_archived?: boolean
          is_fork?: boolean
          is_private?: boolean
          name: string
          owner: string
          primary_language?: string | null
          pushed_at?: string | null
          updated_at?: string
          url: string
          user_id?: string
        }
        Update: {
          commits_synced_at?: string | null
          created_at?: string
          default_branch?: string | null
          deps_synced_at?: string | null
          description?: string | null
          full_name?: string
          github_id?: number
          id?: string
          ignored?: boolean
          is_archived?: boolean
          is_fork?: boolean
          is_private?: boolean
          name?: string
          owner?: string
          primary_language?: string | null
          pushed_at?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          rate_limit_remaining: number | null
          started_at: string
          stats: Json
          status: string
          trigger: string
          user_id: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          rate_limit_remaining?: number | null
          started_at?: string
          stats?: Json
          status?: string
          trigger: string
          user_id?: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          rate_limit_remaining?: number | null
          started_at?: string
          stats?: Json
          status?: string
          trigger?: string
          user_id?: string
        }
        Relationships: []
      }
      task_commits: {
        Row: {
          closed_task: boolean
          commit_id: string
          linked_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          closed_task?: boolean
          commit_id: string
          linked_at?: string
          task_id: string
          user_id?: string
        }
        Update: {
          closed_task?: boolean
          commit_id?: string
          linked_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_commits_commit_id_user_id_fkey"
            columns: ["commit_id", "user_id"]
            isOneToOne: false
            referencedRelation: "commits"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "task_commits_task_id_user_id_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      tasks: {
        Row: {
          category_id: string | null
          created_at: string
          done_at: string | null
          done_via: string | null
          due_date: string | null
          id: string
          milestone_id: string | null
          notes: string | null
          number: number
          position: number
          project_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          done_at?: string | null
          done_via?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          notes?: string | null
          number?: number
          position?: number
          project_id: string
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          done_at?: string | null
          done_via?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          notes?: string | null
          number?: number
          position?: number
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_user_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_user_id_fkey"
            columns: ["milestone_id", "user_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "tasks_project_id_user_id_fkey"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      commit_counts: {
        Args: { p_from: string; p_to: string }
        Returns: {
          commits: number
          day: string
        }[]
      }
      language_monthly: {
        Args: { p_from: string; p_to: string }
        Returns: {
          language: string
          lines: number
          month: string
        }[]
      }
      language_stats: {
        Args: { p_from: string; p_to: string }
        Returns: {
          commits: number
          language: string
          lines: number
        }[]
      }
      library_usage: {
        Args: { p_from: string; p_to: string }
        Returns: {
          active_repos: number
          dev_only: boolean
          ecosystem: string
          name: string
          repos: number
          weight: number
        }[]
      }
      project_activity: {
        Args: { p_from: string; p_to: string }
        Returns: {
          commits: number
          last_commit_at: string
          project_id: string
        }[]
      }
      project_commit_counts: {
        Args: { p_from: string; p_project: string; p_to: string }
        Returns: {
          commits: number
          day: string
        }[]
      }
      repo_commit_counts: {
        Args: { p_from: string; p_to: string }
        Returns: {
          commits: number
          full_name: string
          last_commit_at: string
          repo_id: string
        }[]
      }
      verify_cron_secret: { Args: { p_secret: string }; Returns: boolean }
    }
    Enums: {
      habit_kind: "boolean" | "quantity" | "github"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      habit_kind: ["boolean", "quantity", "github"],
    },
  },
} as const
