import Foundation
import Supabase

let supabase = SupabaseClient(
    supabaseURL: URL(string: "https://epgtahifcphwjifxmxst.supabase.co")!,
    supabaseKey: "sb_publishable_yMgB7J2Z2N6YhD_8llRXKQ_GjiY4qJf",
    options: SupabaseClientOptions(
        auth: SupabaseClientOptions.AuthOptions(
            emitLocalSessionAsInitialSession: true
        )
    )
)
