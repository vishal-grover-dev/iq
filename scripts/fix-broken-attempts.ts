#!/usr/bin/env tsx

/**
 * Script to detect and fix broken attempts with gaps in question sequence
 * Run with: npx tsx scripts/fix-broken-attempts.ts
 */

import { getSupabaseServiceRoleClient } from "../config/supabase.config";

async function findAndFixBrokenAttempts() {
  const supabase = getSupabaseServiceRoleClient();

  console.log("🔍 Scanning for broken attempts...");

  // Find all completed attempts
  const { data: completedAttempts, error: attemptsError } = await supabase
    .from("user_attempts")
    .select("id, questions_answered, total_questions, status, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (attemptsError) {
    console.error("❌ Error fetching attempts:", attemptsError);
    return;
  }

  console.log(`📊 Found ${completedAttempts?.length || 0} completed attempts`);

  for (const attempt of completedAttempts || []) {
    console.log(`\n🔍 Checking attempt ${attempt.id}...`);
    console.log(`   Questions answered: ${attempt.questions_answered}/${attempt.total_questions}`);

    // Get actual assigned questions
    const { data: assignedQuestions, error: questionsError } = await supabase
      .from("attempt_questions")
      .select("question_order")
      .eq("attempt_id", attempt.id)
      .order("question_order", { ascending: true });

    if (questionsError) {
      console.error(`❌ Error fetching questions for attempt ${attempt.id}:`, questionsError);
      continue;
    }

    const assigned = assignedQuestions || [];
    const actualCount = assigned.length;
    const expectedCount = attempt.total_questions;

    console.log(`   Actual assigned: ${actualCount}/${expectedCount}`);

    // Check for gaps
    const assignedOrders = assigned.map((q) => q.question_order).sort((a, b) => a - b);
    const expectedOrders = Array.from({ length: expectedCount }, (_, i) => i + 1);
    const missingOrders = expectedOrders.filter((order) => !assignedOrders.includes(order));

    if (missingOrders.length > 0) {
      console.log(`🚨 BROKEN ATTEMPT DETECTED!`);
      console.log(`   Missing question orders: ${missingOrders.join(", ")}`);
      console.log(`   Gaps: ${missingOrders.length}`);

      // Ask user if they want to fix this attempt
      console.log(`\n🔧 Attempt ${attempt.id} has ${missingOrders.length} missing questions.`);
      console.log(`   This explains why you're seeing "50" instead of "60".`);
      console.log(`   To fix this attempt, you can:`);
      console.log(`   1. Use the recovery endpoint: POST /api/evaluate/attempts/${attempt.id}/recover`);
      console.log(`   2. Or manually reset the attempt status to 'in_progress'`);
      console.log(`   3. Or start a new attempt`);

      // Show the first few missing orders for context
      const firstFewMissing = missingOrders.slice(0, 5);
      console.log(`   First few missing orders: ${firstFewMissing.join(", ")}${missingOrders.length > 5 ? "..." : ""}`);
    } else {
      console.log(`✅ Attempt ${attempt.id} is properly completed`);
    }
  }

  console.log(`\n📋 Summary:`);
  console.log(`   Total completed attempts: ${completedAttempts?.length || 0}`);
  console.log(`   Use the recovery endpoint to fix broken attempts`);
  console.log(`   Or start a new attempt to test the fix`);
}

// Run the script
findAndFixBrokenAttempts().catch(console.error);
