// ============ exercises.js : STRVEX 250+ EXERCISE DATABASE, GUIDES & SPLITS ============

const DEFAULT_EXERCISES = [
  // --- CHEST (34) ---
  { id: "ex_bb_bench", name: "Barbell Bench Press", type: "weight", equipment: "Barbell", primary: "Chest", secondary: ["Triceps", "Shoulders"] },
  { id: "ex_bb_inc_bench", name: "Incline Barbell Bench Press", type: "weight", equipment: "Barbell", primary: "Chest", secondary: ["Shoulders", "Triceps"] },
  { id: "ex_bb_dec_bench", name: "Decline Barbell Bench Press", type: "weight", equipment: "Barbell", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_db_bench", name: "Dumbbell Bench Press", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Triceps", "Shoulders"] },
  { id: "ex_db_inc_bench", name: "Incline Dumbbell Press", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Shoulders", "Triceps"] },
  { id: "ex_db_dec_bench", name: "Decline Dumbbell Press", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_db_squeeze_press", name: "Dumbbell Squeeze Press (Hex Press)", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_db_inc_squeeze", name: "Incline Dumbbell Squeeze Press", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Shoulders", "Triceps"] },
  { id: "ex_mach_chest_press", name: "Machine Chest Press", type: "weight", equipment: "Machine", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_mach_inc_press", name: "Incline Machine Chest Press", type: "weight", equipment: "Machine", primary: "Chest", secondary: ["Shoulders", "Triceps"] },
  { id: "ex_mach_dec_press", name: "Decline Machine Chest Press", type: "weight", equipment: "Machine", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_smith_bench", name: "Smith Machine Bench Press", type: "weight", equipment: "Smith Machine", primary: "Chest", secondary: ["Triceps", "Shoulders"] },
  { id: "ex_smith_inc_bench", name: "Smith Machine Incline Press", type: "weight", equipment: "Smith Machine", primary: "Chest", secondary: ["Shoulders", "Triceps"] },
  { id: "ex_smith_dec_bench", name: "Smith Machine Decline Press", type: "weight", equipment: "Smith Machine", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_pec_deck", name: "Pec Deck Fly Machine", type: "weight", equipment: "Machine", primary: "Chest", secondary: ["Shoulders"] },
  { id: "ex_cable_fly_mid", name: "Cable Chest Fly (Mid Pulley)", type: "weight", equipment: "Cable", primary: "Chest", secondary: ["Shoulders"] },
  { id: "ex_cable_fly_high", name: "High-to-Low Cable Fly", type: "weight", equipment: "Cable", primary: "Chest", secondary: [] },
  { id: "ex_cable_fly_low", name: "Low-to-High Cable Fly", type: "weight", equipment: "Cable", primary: "Chest", secondary: ["Shoulders"] },
  { id: "ex_cable_crossover", name: "Cable Crossover (Standing)", type: "weight", equipment: "Cable", primary: "Chest", secondary: ["Shoulders"] },
  { id: "ex_db_fly", name: "Flat Dumbbell Fly", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: [] },
  { id: "ex_db_inc_fly", name: "Incline Dumbbell Fly", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Shoulders"] },
  { id: "ex_db_dec_fly", name: "Decline Dumbbell Fly", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: [] },
  { id: "ex_dips_chest", name: "Chest Dips (Bodyweight)", type: "reps", equipment: "Bodyweight", primary: "Chest", secondary: ["Triceps", "Shoulders"] },
  { id: "ex_dips_weighted", name: "Weighted Chest Dips", type: "weight", equipment: "Bodyweight", primary: "Chest", secondary: ["Triceps", "Shoulders"] },
  { id: "ex_dips_assisted", name: "Assisted Chest Dips Machine", type: "weight", equipment: "Machine", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_pushups", name: "Standard Push-Ups", type: "reps", equipment: "Bodyweight", primary: "Chest", secondary: ["Triceps", "Core"] },
  { id: "ex_deficit_pushups", name: "Deficit Push-Ups", type: "reps", equipment: "Bodyweight", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_diamond_pushups", name: "Diamond Push-Ups", type: "reps", equipment: "Bodyweight", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_incline_pushups", name: "Incline Bench Push-Ups", type: "reps", equipment: "Bodyweight", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_decline_pushups", name: "Decline Push-Ups (Feet Elevated)", type: "reps", equipment: "Bodyweight", primary: "Chest", secondary: ["Shoulders", "Triceps"] },
  { id: "ex_db_pullover", name: "Dumbbell Pullover", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Back", "Triceps"] },
  { id: "ex_bb_pullover", name: "Barbell Pullover", type: "weight", equipment: "Barbell", primary: "Chest", secondary: ["Back", "Triceps"] },
  { id: "ex_floor_press_bb", name: "Barbell Floor Press", type: "weight", equipment: "Barbell", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_floor_press_db", name: "Dumbbell Floor Press", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Triceps"] },

  // --- BACK (34) ---
  { id: "ex_conv_deadlift", name: "Conventional Barbell Deadlift", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Hamstrings", "Glutes", "Forearms"] },
  { id: "ex_trap_bar_deadlift", name: "Trap Bar Deadlift", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Quads", "Glutes", "Hamstrings"] },
  { id: "ex_rack_pull", name: "Rack Pulls (Above Knee)", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Forearms", "Glutes"] },
  { id: "ex_bb_bent_row", name: "Barbell Bent-Over Row", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Biceps", "Forearms"] },
  { id: "ex_pendlay_row", name: "Pendlay Barbell Row", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Biceps", "Core"] },
  { id: "ex_underhand_bb_row", name: "Yates Row (Underhand Barbell Row)", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_db_single_row", name: "Single-Arm Dumbbell Row", type: "weight", equipment: "Dumbbell", primary: "Back", secondary: ["Biceps", "Forearms"] },
  { id: "ex_db_chest_row", name: "Incline Chest-Supported DB Row", type: "weight", equipment: "Dumbbell", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_seal_row", name: "Seal Row (Barbell on Elevated Bench)", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_tbar_row", name: "T-Bar Row (Chest Supported)", type: "weight", equipment: "Machine", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_landmine_row", name: "Landmine T-Bar Row", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Biceps", "Core"] },
  { id: "ex_mach_lat_row", name: "Machine Seated Row", type: "weight", equipment: "Machine", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_mach_high_row", name: "Machine High Row", type: "weight", equipment: "Machine", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_lat_pulldown_wide", name: "Lat Pulldown (Wide Grip)", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_lat_pulldown_close", name: "Lat Pulldown (Close Grip / V-Bar)", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_lat_pulldown_under", name: "Reverse-Grip Lat Pulldown", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_cable_single_lat", name: "Single-Arm Half-Kneeling Lat Pulldown", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_lat_prayer", name: "Straight-Arm Cable Pulldown (Lat Prayer)", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Triceps"] },
  { id: "ex_pullups", name: "Pull-Ups", type: "reps", equipment: "Bodyweight", primary: "Back", secondary: ["Biceps", "Core"] },
  { id: "ex_pullups_weighted", name: "Weighted Pull-Ups", type: "weight", equipment: "Bodyweight", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_pullups_assisted", name: "Assisted Pull-Ups Machine", type: "weight", equipment: "Machine", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_chinups", name: "Chin-Ups (Underhand Grip)", type: "reps", equipment: "Bodyweight", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_chinups_weighted", name: "Weighted Chin-Ups", type: "weight", equipment: "Bodyweight", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_seated_cable_row", name: "Seated Cable Row (Close Grip)", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Biceps", "Forearms"] },
  { id: "ex_seated_cable_row_wide", name: "Seated Cable Row (Wide Grip)", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Shoulders"] },
  { id: "ex_seated_single_cable_row", name: "Single-Arm Seated Cable Row", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_inverted_row", name: "Inverted Bodyweight Row", type: "reps", equipment: "Bodyweight", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_bb_shrug", name: "Barbell Shrug", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Forearms"] },
  { id: "ex_db_shrug", name: "Dumbbell Shrug", type: "weight", equipment: "Dumbbell", primary: "Back", secondary: ["Forearms"] },
  { id: "ex_smith_shrug", name: "Smith Machine Shrug", type: "weight", equipment: "Smith Machine", primary: "Back", secondary: ["Forearms"] },
  { id: "ex_trap_bar_shrug", name: "Trap Bar Shrug", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Forearms"] },
  { id: "ex_hyperextension", name: "Back Extension / Hyperextension", type: "reps", equipment: "Bodyweight", primary: "Back", secondary: ["Glutes", "Hamstrings"] },
  { id: "ex_hyperextension_weighted", name: "Weighted Back Extension", type: "weight", equipment: "Bodyweight", primary: "Back", secondary: ["Glutes", "Hamstrings"] },
  { id: "ex_good_mornings", name: "Barbell Good Mornings", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Hamstrings", "Glutes"] },

  // --- SHOULDERS (26) ---
  { id: "ex_bb_ohp", name: "Overhead Press (Standing Military)", type: "weight", equipment: "Barbell", primary: "Shoulders", secondary: ["Triceps", "Core"] },
  { id: "ex_bb_seated_press", name: "Seated Barbell Overhead Press", type: "weight", equipment: "Barbell", primary: "Shoulders", secondary: ["Triceps"] },
  { id: "ex_db_shoulder_press", name: "Seated Dumbbell Shoulder Press", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Triceps"] },
  { id: "ex_db_standing_press", name: "Standing Dumbbell Shoulder Press", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Triceps", "Core"] },
  { id: "ex_arnold_press", name: "Arnold Dumbbell Press", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Triceps"] },
  { id: "ex_mach_ohp", name: "Machine Shoulder Press", type: "weight", equipment: "Machine", primary: "Shoulders", secondary: ["Triceps"] },
  { id: "ex_smith_ohp", name: "Smith Machine Shoulder Press", type: "weight", equipment: "Smith Machine", primary: "Shoulders", secondary: ["Triceps"] },
  { id: "ex_db_lateral_raise", name: "Dumbbell Lateral Raise", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: [] },
  { id: "ex_db_seated_lateral", name: "Seated Dumbbell Lateral Raise", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: [] },
  { id: "ex_cable_lateral_raise", name: "Single-Arm Cable Lateral Raise", type: "weight", equipment: "Cable", primary: "Shoulders", secondary: [] },
  { id: "ex_cable_cuff_lateral", name: "Behind-the-Back Cable Lateral Raise", type: "weight", equipment: "Cable", primary: "Shoulders", secondary: [] },
  { id: "ex_mach_lateral_raise", name: "Machine Lateral Raise", type: "weight", equipment: "Machine", primary: "Shoulders", secondary: [] },
  { id: "ex_lean_away_lateral", name: "Leaning Dumbbell Lateral Raise", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: [] },
  { id: "ex_db_front_raise", name: "Dumbbell Front Raise", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Chest"] },
  { id: "ex_bb_front_raise", name: "Barbell Front Raise", type: "weight", equipment: "Barbell", primary: "Shoulders", secondary: ["Chest"] },
  { id: "ex_cable_front_raise", name: "Cable Front Raise", type: "weight", equipment: "Cable", primary: "Shoulders", secondary: ["Chest"] },
  { id: "ex_plate_front_raise", name: "Weight Plate Front Raise", type: "weight", equipment: "Barbell", primary: "Shoulders", secondary: ["Chest"] },
  { id: "ex_face_pull", name: "Cable Face Pull", type: "weight", equipment: "Cable", primary: "Shoulders", secondary: ["Back"] },
  { id: "ex_rev_pec_deck", name: "Reverse Pec Deck Fly (Rear Delts)", type: "weight", equipment: "Machine", primary: "Shoulders", secondary: ["Back"] },
  { id: "ex_rear_delt_cable_fly", name: "Cross-Body Cable Rear Delt Fly", type: "weight", equipment: "Cable", primary: "Shoulders", secondary: ["Back"] },
  { id: "ex_db_rear_delt_raise", name: "Incline Prone Rear Delt DB Fly", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Back"] },
  { id: "ex_upright_row_cable", name: "Cable Upright Row", type: "weight", equipment: "Cable", primary: "Shoulders", secondary: ["Biceps", "Back"] },
  { id: "ex_upright_row_bb", name: "Barbell Upright Row", type: "weight", equipment: "Barbell", primary: "Shoulders", secondary: ["Biceps", "Back"] },
  { id: "ex_lu_raises", name: "Lu Raises (Full Lateral Raise)", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Back"] },
  { id: "ex_db_push_press", name: "Dumbbell Push Press", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Triceps", "Quads"] },
  { id: "ex_landmine_press", name: "Landmine Single-Arm Press", type: "weight", equipment: "Barbell", primary: "Shoulders", secondary: ["Triceps", "Core"] },

  // --- BICEPS (20) ---
  { id: "ex_bb_curl", name: "Barbell Bicep Curl", type: "weight", equipment: "Barbell", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_ez_curl", name: "EZ-Bar Bicep Curl", type: "weight", equipment: "Barbell", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_db_curl", name: "Standing Dumbbell Bicep Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_db_seated_curl", name: "Seated Dumbbell Bicep Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_db_hammer_curl", name: "Dumbbell Hammer Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_db_inc_curl", name: "Incline Dumbbell Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_db_inc_hammer", name: "Incline Dumbbell Hammer Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_preacher_curl_ez", name: "EZ-Bar Preacher Curl", type: "weight", equipment: "Barbell", primary: "Biceps", secondary: [] },
  { id: "ex_preacher_curl_mach", name: "Machine Preacher Curl", type: "weight", equipment: "Machine", primary: "Biceps", secondary: [] },
  { id: "ex_preacher_curl_db", name: "Single-Arm DB Preacher Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: [] },
  { id: "ex_cable_curl_bar", name: "Cable Bicep Curl (Straight Bar)", type: "weight", equipment: "Cable", primary: "Biceps", secondary: [] },
  { id: "ex_cable_curl_ez", name: "Cable EZ-Bar Bicep Curl", type: "weight", equipment: "Cable", primary: "Biceps", secondary: [] },
  { id: "ex_cable_rope_hammer", name: "Cable Rope Hammer Curl", type: "weight", equipment: "Cable", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_concentration_curl", name: "Dumbbell Concentration Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: [] },
  { id: "ex_spider_curl", name: "Dumbbell Spider Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: [] },
  { id: "ex_spider_curl_ez", name: "EZ-Bar Spider Curl", type: "weight", equipment: "Barbell", primary: "Biceps", secondary: [] },
  { id: "ex_bayonian_curl", name: "Behind-the-Back Cable Curl (Bayesian)", type: "weight", equipment: "Cable", primary: "Biceps", secondary: [] },
  { id: "ex_high_cable_curl", name: "Overhead Dual Cable Bicep Curl", type: "weight", equipment: "Cable", primary: "Biceps", secondary: [] },
  { id: "ex_drag_curl", name: "Barbell Drag Curl", type: "weight", equipment: "Barbell", primary: "Biceps", secondary: [] },
  { id: "ex_reverse_curl_bb", name: "Reverse-Grip Barbell Curl", type: "weight", equipment: "Barbell", primary: "Biceps", secondary: ["Forearms"] },

  // --- TRICEPS (20) ---
  { id: "ex_tricep_rope_pushdown", name: "Cable Rope Tricep Pushdown", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_tricep_bar_pushdown", name: "Cable Straight-Bar Pushdown", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_tricep_vbar_pushdown", name: "Cable V-Bar Pushdown", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_single_cable_pushdown", name: "Single-Arm Cable Pushdown", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_cross_cable_ext", name: "Dual Cable Cross-Body Tricep Extension", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_cable_overhead_ext", name: "Overhead Cable Tricep Extension", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_skull_crushers_ez", name: "EZ-Bar Skull Crushers (Lying Ext)", type: "weight", equipment: "Barbell", primary: "Triceps", secondary: [] },
  { id: "ex_skull_crushers_db", name: "Dumbbell Skull Crushers", type: "weight", equipment: "Dumbbell", primary: "Triceps", secondary: [] },
  { id: "ex_db_overhead_ext", name: "Seated Dumbbell Overhead Extension", type: "weight", equipment: "Dumbbell", primary: "Triceps", secondary: [] },
  { id: "ex_db_single_overhead", name: "Single-Arm DB Overhead Extension", type: "weight", equipment: "Dumbbell", primary: "Triceps", secondary: [] },
  { id: "ex_close_grip_bench", name: "Close-Grip Barbell Bench Press", type: "weight", equipment: "Barbell", primary: "Triceps", secondary: ["Chest", "Shoulders"] },
  { id: "ex_close_grip_smith", name: "Smith Machine Close-Grip Bench Press", type: "weight", equipment: "Smith Machine", primary: "Triceps", secondary: ["Chest", "Shoulders"] },
  { id: "ex_dips_triceps", name: "Parallel Bar Dips (Upright)", type: "reps", equipment: "Bodyweight", primary: "Triceps", secondary: ["Chest", "Shoulders"] },
  { id: "ex_bench_dips", name: "Bench Dips", type: "reps", equipment: "Bodyweight", primary: "Triceps", secondary: ["Chest"] },
  { id: "ex_bench_dips_weighted", name: "Weighted Bench Dips", type: "weight", equipment: "Bodyweight", primary: "Triceps", secondary: ["Chest"] },
  { id: "ex_jm_press", name: "JM Press (Barbell)", type: "weight", equipment: "Barbell", primary: "Triceps", secondary: ["Chest"] },
  { id: "ex_tate_press", name: "Dumbbell Tate Press", type: "weight", equipment: "Dumbbell", primary: "Triceps", secondary: [] },
  { id: "ex_kickbacks_db", name: "Dumbbell Tricep Kickback", type: "weight", equipment: "Dumbbell", primary: "Triceps", secondary: [] },
  { id: "ex_kickbacks_cable", name: "Cable Tricep Kickback", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_mach_tricep_ext", name: "Machine Seated Tricep Extension", type: "weight", equipment: "Machine", primary: "Triceps", secondary: [] },

  // --- FOREARMS (8) ---
  { id: "ex_bb_wrist_curl", name: "Barbell Palms-Up Wrist Curl", type: "weight", equipment: "Barbell", primary: "Forearms", secondary: [] },
  { id: "ex_bb_rev_wrist_curl", name: "Barbell Palms-Down Wrist Curl", type: "weight", equipment: "Barbell", primary: "Forearms", secondary: [] },
  { id: "ex_db_wrist_curl", name: "Dumbbell Wrist Curl", type: "weight", equipment: "Dumbbell", primary: "Forearms", secondary: [] },
  { id: "ex_db_rev_wrist_curl", name: "Dumbbell Reverse Wrist Curl", type: "weight", equipment: "Dumbbell", primary: "Forearms", secondary: [] },
  { id: "ex_farmers_walk", name: "Dumbbell Farmer's Walk", type: "weight", equipment: "Dumbbell", primary: "Forearms", secondary: ["Back", "Core"] },
  { id: "ex_dead_hang", name: "Dead Hang from Pull-Up Bar", type: "time", equipment: "Bodyweight", primary: "Forearms", secondary: ["Back"] },
  { id: "ex_plate_pinch", name: "Weight Plate Pinch Hold", type: "time", equipment: "Barbell", primary: "Forearms", secondary: [] },
  { id: "ex_wrist_roller", name: "Wrist Roller Forearm Curl", type: "weight", equipment: "Machine", primary: "Forearms", secondary: [] },

  // --- QUADS (22) ---
  { id: "ex_bb_squat_high", name: "Barbell Back Squat (High Bar)", type: "weight", equipment: "Barbell", primary: "Quads", secondary: ["Glutes", "Core"] },
  { id: "ex_bb_squat_low", name: "Barbell Back Squat (Low Bar)", type: "weight", equipment: "Barbell", primary: "Quads", secondary: ["Glutes", "Hamstrings"] },
  { id: "ex_bb_front_squat", name: "Barbell Front Squat", type: "weight", equipment: "Barbell", primary: "Quads", secondary: ["Core", "Glutes"] },
  { id: "ex_leg_press", name: "Incline 45° Leg Press", type: "weight", equipment: "Machine", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_single_leg_press", name: "Single-Leg Press (45°)", type: "weight", equipment: "Machine", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_hack_squat", name: "Hack Squat Machine", type: "weight", equipment: "Machine", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_pendulum_squat", name: "Pendulum Squat Machine", type: "weight", equipment: "Machine", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_bulgarian_split_squat", name: "Bulgarian Split Squat", type: "weight", equipment: "Dumbbell", primary: "Quads", secondary: ["Glutes", "Hamstrings"] },
  { id: "ex_bulgarian_smith", name: "Smith Machine Bulgarian Split Squat", type: "weight", equipment: "Smith Machine", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_walking_lunges_db", name: "Dumbbell Walking Lunges", type: "weight", equipment: "Dumbbell", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_reverse_lunge_bb", name: "Barbell Reverse Lunge", type: "weight", equipment: "Barbell", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_reverse_lunge_db", name: "Dumbbell Reverse Lunge", type: "weight", equipment: "Dumbbell", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_goblet_squat", name: "Dumbbell Goblet Squat", type: "weight", equipment: "Dumbbell", primary: "Quads", secondary: ["Core"] },
  { id: "ex_leg_extension", name: "Leg Extension Machine", type: "weight", equipment: "Machine", primary: "Quads", secondary: [] },
  { id: "ex_single_leg_ext", name: "Single-Leg Extension Machine", type: "weight", equipment: "Machine", primary: "Quads", secondary: [] },
  { id: "ex_sissy_squat", name: "Sissy Squat (Bodyweight)", type: "reps", equipment: "Bodyweight", primary: "Quads", secondary: [] },
  { id: "ex_smith_squat", name: "Smith Machine Squat", type: "weight", equipment: "Smith Machine", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_step_ups", name: "Dumbbell Box Step-Ups", type: "weight", equipment: "Dumbbell", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_zercher_squat", name: "Zercher Squat", type: "weight", equipment: "Barbell", primary: "Quads", secondary: ["Core", "Back"] },
  { id: "ex_wall_sit", name: "Wall Sit Isometric Hold", type: "time", equipment: "Bodyweight", primary: "Quads", secondary: [] },
  { id: "ex_bodyweight_squat", name: "Bodyweight Air Squats", type: "reps", equipment: "Bodyweight", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_box_squat", name: "Barbell Box Squat", type: "weight", equipment: "Barbell", primary: "Quads", secondary: ["Glutes"] },

  // --- HAMSTRINGS (16) ---
  { id: "ex_rdl_bb", name: "Barbell Romanian Deadlift (RDL)", type: "weight", equipment: "Barbell", primary: "Hamstrings", secondary: ["Glutes", "Back"] },
  { id: "ex_rdl_db", name: "Dumbbell Romanian Deadlift (RDL)", type: "weight", equipment: "Dumbbell", primary: "Hamstrings", secondary: ["Glutes", "Back"] },
  { id: "ex_stiff_deadlift", name: "Stiff-Legged Barbell Deadlift", type: "weight", equipment: "Barbell", primary: "Hamstrings", secondary: ["Back", "Glutes"] },
  { id: "ex_lying_leg_curl", name: "Lying Leg Curl Machine", type: "weight", equipment: "Machine", primary: "Hamstrings", secondary: ["Calves"] },
  { id: "ex_seated_leg_curl", name: "Seated Leg Curl Machine", type: "weight", equipment: "Machine", primary: "Hamstrings", secondary: [] },
  { id: "ex_standing_leg_curl", name: "Single-Leg Standing Curl Machine", type: "weight", equipment: "Machine", primary: "Hamstrings", secondary: [] },
  { id: "ex_nordic_curl", name: "Nordic Hamstring Curl", type: "reps", equipment: "Bodyweight", primary: "Hamstrings", secondary: ["Glutes"] },
  { id: "ex_glute_ham_raise", name: "Glute-Ham Developer Raise (GHD)", type: "reps", equipment: "Bodyweight", primary: "Hamstrings", secondary: ["Glutes", "Back"] },
  { id: "ex_single_leg_rdl_db", name: "Single-Leg Dumbbell RDL", type: "weight", equipment: "Dumbbell", primary: "Hamstrings", secondary: ["Glutes"] },
  { id: "ex_swiss_ball_curl", name: "Stability Ball Leg Curl", type: "reps", equipment: "Bodyweight", primary: "Hamstrings", secondary: ["Glutes"] },
  { id: "ex_cable_leg_curl", name: "Standing Cable Leg Curl", type: "weight", equipment: "Cable", primary: "Hamstrings", secondary: [] },
  { id: "ex_def_rdl", name: "Deficit Romanian Deadlift", type: "weight", equipment: "Barbell", primary: "Hamstrings", secondary: ["Glutes"] },
  { id: "ex_smith_rdl", name: "Smith Machine Romanian Deadlift", type: "weight", equipment: "Smith Machine", primary: "Hamstrings", secondary: ["Glutes"] },
  { id: "ex_single_leg_seated_curl", name: "Single-Leg Seated Leg Curl", type: "weight", equipment: "Machine", primary: "Hamstrings", secondary: [] },
  { id: "ex_slider_leg_curl", name: "Floor Slider Leg Curl", type: "reps", equipment: "Bodyweight", primary: "Hamstrings", secondary: ["Glutes"] },
  { id: "ex_banded_leg_curl", name: "Banded Leg Curl", type: "reps", equipment: "Bodyweight", primary: "Hamstrings", secondary: [] },

  // --- GLUTES (12) ---
  { id: "ex_hip_thrust_bb", name: "Barbell Hip Thrust", type: "weight", equipment: "Barbell", primary: "Glutes", secondary: ["Hamstrings"] },
  { id: "ex_hip_thrust_db", name: "Dumbbell Hip Thrust", type: "weight", equipment: "Dumbbell", primary: "Glutes", secondary: ["Hamstrings"] },
  { id: "ex_hip_thrust_mach", name: "Machine Hip Thrust", type: "weight", equipment: "Machine", primary: "Glutes", secondary: ["Hamstrings"] },
  { id: "ex_smith_hip_thrust", name: "Smith Machine Hip Thrust", type: "weight", equipment: "Smith Machine", primary: "Glutes", secondary: ["Hamstrings"] },
  { id: "ex_glute_kickback_cable", name: "Cable Glute Kickback", type: "weight", equipment: "Cable", primary: "Glutes", secondary: [] },
  { id: "ex_abductor_mach", name: "Hip Abductor Machine", type: "weight", equipment: "Machine", primary: "Glutes", secondary: [] },
  { id: "ex_adductor_mach", name: "Hip Adductor Machine", type: "weight", equipment: "Machine", primary: "Glutes", secondary: ["Quads"] },
  { id: "ex_sumo_deadlift", name: "Sumo Deadlift", type: "weight", equipment: "Barbell", primary: "Glutes", secondary: ["Hamstrings", "Quads", "Back"] },
  { id: "ex_cable_pull_through", name: "Cable Pull-Through", type: "weight", equipment: "Cable", primary: "Glutes", secondary: ["Hamstrings"] },
  { id: "ex_frog_pumps", name: "Dumbbell Frog Pumps", type: "weight", equipment: "Dumbbell", primary: "Glutes", secondary: [] },
  { id: "ex_glute_bridge_single", name: "Single-Leg Glute Bridge", type: "reps", equipment: "Bodyweight", primary: "Glutes", secondary: ["Hamstrings"] },
  { id: "ex_cable_curtsy_lunge", name: "Cable Curtsy Lunge", type: "weight", equipment: "Cable", primary: "Glutes", secondary: ["Quads"] },

  // --- CALVES (10) ---
  { id: "ex_standing_calf_raise", name: "Standing Machine Calf Raise", type: "weight", equipment: "Machine", primary: "Calves", secondary: [] },
  { id: "ex_seated_calf_raise", name: "Seated Machine Calf Raise", type: "weight", equipment: "Machine", primary: "Calves", secondary: [] },
  { id: "ex_leg_press_calf", name: "Leg Press Calf Extension", type: "weight", equipment: "Machine", primary: "Calves", secondary: [] },
  { id: "ex_single_db_calf", name: "Single-Leg Dumbbell Calf Raise", type: "weight", equipment: "Dumbbell", primary: "Calves", secondary: [] },
  { id: "ex_smith_calf_raise", name: "Smith Machine Calf Raise", type: "weight", equipment: "Smith Machine", primary: "Calves", secondary: [] },
  { id: "ex_donkey_calf_raise", name: "Donkey Calf Raise Machine", type: "weight", equipment: "Machine", primary: "Calves", secondary: [] },
  { id: "ex_bb_calf_raise", name: "Standing Barbell Calf Raise", type: "weight", equipment: "Barbell", primary: "Calves", secondary: [] },
  { id: "ex_tibialis_raise", name: "Tibialis Shin Raise (Bodyweight)", type: "reps", equipment: "Bodyweight", primary: "Calves", secondary: [] },
  { id: "ex_db_tibialis_raise", name: "Dumbbell Tibialis Anterior Raise", type: "weight", equipment: "Dumbbell", primary: "Calves", secondary: [] },
  { id: "ex_single_body_calf", name: "Single-Leg Bodyweight Calf Raise", type: "reps", equipment: "Bodyweight", primary: "Calves", secondary: [] },

  // --- CORE & ABS (24 — Fully Expanded with Floor & Machine Crunches!) ---
  { id: "ex_floor_crunch", name: "Floor Abdominal Crunch", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_mach_crunch", name: "Machine Abdominal Crunch", type: "weight", equipment: "Machine", primary: "Core", secondary: [] },
  { id: "ex_cable_crunch", name: "Kneeling Cable Crunch", type: "weight", equipment: "Cable", primary: "Core", secondary: [] },
  { id: "ex_decline_crunch", name: "Decline Bench Weighted Crunch", type: "weight", equipment: "Dumbbell", primary: "Core", secondary: [] },
  { id: "ex_reverse_crunch", name: "Floor Reverse Crunch", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_bicycle_crunch", name: "Bicycle Crunches", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_hanging_leg_raise", name: "Hanging Leg Raise (Toes to Bar)", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: ["Forearms"] },
  { id: "ex_hanging_knee_raise", name: "Hanging Knee Raise", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_captains_chair", name: "Captain's Chair Leg Raise", type: "reps", equipment: "Machine", primary: "Core", secondary: [] },
  { id: "ex_lying_leg_raise", name: "Lying Floor Leg Raise", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_ab_wheel", name: "Ab Wheel Rollout", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: ["Back", "Shoulders"] },
  { id: "ex_woodchoppers", name: "Cable Woodchoppers", type: "weight", equipment: "Cable", primary: "Core", secondary: [] },
  { id: "ex_pallof_press", name: "Cable Pallof Press", type: "weight", equipment: "Cable", primary: "Core", secondary: [] },
  { id: "ex_russian_twist", name: "Weighted Russian Twist", type: "weight", equipment: "Dumbbell", primary: "Core", secondary: [] },
  { id: "ex_plank", name: "Standard Isometric Plank", type: "time", equipment: "Bodyweight", primary: "Core", secondary: ["Shoulders"] },
  { id: "ex_plank_weighted", name: "Weighted Isometric Plank", type: "weight", equipment: "Bodyweight", primary: "Core", secondary: ["Shoulders"] },
  { id: "ex_side_plank", name: "Side Plank", type: "time", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_dragon_flag", name: "Dragon Flag", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: ["Back"] },
  { id: "ex_deadbug", name: "Deadbug (Bodyweight)", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_vacuum", name: "Stomach Vacuum Hold", type: "time", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_toe_touches", name: "Floor Toe Touch Crunches", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_flutter_kicks", name: "Flutter Kicks", type: "time", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_bird_dog", name: "Bird Dog Core Isometric", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_cable_side_bend", name: "Cable Side Bend", type: "weight", equipment: "Cable", primary: "Core", secondary: [] }
];

// --- 5 CURATED ROUTINE SPLITS ---
const CURATED_ROUTINES = [
  {
    id: "routine_fullbody_a",
    category: "Beginner Track (3 Days)",
    name: "Full Body (Day 1)",
    description: "Build foundational compound strength with squat, bench press, and rows. Rest 90-120s between main sets.",
    exercises: [
      { exId: "ex_bb_squat_high", sets: 3, reps: "8-10" },
      { exId: "ex_bb_bench", sets: 3, reps: "8-10" },
      { exId: "ex_bb_bent_row", sets: 3, reps: "8-10" },
      { exId: "ex_db_lateral_raise", sets: 3, reps: "12-15" },
      { exId: "ex_cable_rope_hammer", sets: 2, reps: "10-12" }
    ]
  },
  {
    id: "routine_fullbody_b",
    category: "Beginner Track (3 Days)",
    name: "Full Body (Day 2)",
    description: "Target posterior chain, shoulders, and upper back with deadlifts, overhead presses, and pulldowns.",
    exercises: [
      { exId: "ex_conv_deadlift", sets: 3, reps: "5-8" },
      { exId: "ex_bb_ohp", sets: 3, reps: "8-10" },
      { exId: "ex_lat_pulldown_wide", sets: 3, reps: "10-12" },
      { exId: "ex_leg_extension", sets: 3, reps: "12-15" },
      { exId: "ex_tricep_rope_pushdown", sets: 2, reps: "10-12" }
    ]
  },
  {
    id: "routine_fullbody_c",
    category: "Beginner Track (3 Days)",
    name: "Full Body (Day 3)",
    description: "Balanced dumbbell and machine full-body session for joint-friendly hypertrophy and core stability.",
    exercises: [
      { exId: "ex_leg_press", sets: 3, reps: "10-12" },
      { exId: "ex_db_inc_bench", sets: 3, reps: "8-12" },
      { exId: "ex_seated_cable_row", sets: 3, reps: "10-12" },
      { exId: "ex_rdl_db", sets: 3, reps: "8-10" },
      { exId: "ex_db_curl", sets: 2, reps: "10-12" },
      { exId: "ex_floor_crunch", sets: 3, reps: "15-20" }
    ]
  },
  {
    id: "routine_upper_a",
    category: "Hypertrophy Track (4 Days)",
    name: "Upper Body (Chest & Back Focus)",
    description: "Heavy upper session targeting bench press, barbell rows, and shoulder accessories.",
    exercises: [
      { exId: "ex_bb_bench", sets: 4, reps: "6-8" },
      { exId: "ex_bb_bent_row", sets: 4, reps: "8-10" },
      { exId: "ex_db_shoulder_press", sets: 3, reps: "8-12" },
      { exId: "ex_lat_pulldown_close", sets: 3, reps: "10-12" },
      { exId: "ex_tricep_bar_pushdown", sets: 3, reps: "10-12" },
      { exId: "ex_ez_curl", sets: 3, reps: "10-12" }
    ]
  },
  {
    id: "routine_lower_a",
    category: "Hypertrophy Track (4 Days)",
    name: "Lower Body (Quad & Calf Focus)",
    description: "High-intensity quad workout featuring back squats, leg presses, and extensions.",
    exercises: [
      { exId: "ex_bb_squat_high", sets: 4, reps: "6-8" },
      { exId: "ex_rdl_bb", sets: 3, reps: "8-10" },
      { exId: "ex_leg_press", sets: 3, reps: "10-12" },
      { exId: "ex_seated_leg_curl", sets: 3, reps: "10-15" },
      { exId: "ex_standing_calf_raise", sets: 4, reps: "12-15" }
    ]
  },
  {
    id: "routine_upper_b",
    category: "Hypertrophy Track (4 Days)",
    name: "Upper Body (Shoulders & Arms Focus)",
    description: "Hypertrophy upper day featuring incline dumbbell press, lateral raises, and arm isolation.",
    exercises: [
      { exId: "ex_db_inc_bench", sets: 4, reps: "8-10" },
      { exId: "ex_seated_cable_row", sets: 4, reps: "10-12" },
      { exId: "ex_db_lateral_raise", sets: 4, reps: "12-15" },
      { exId: "ex_pec_deck", sets: 3, reps: "12-15" },
      { exId: "ex_cable_overhead_ext", sets: 3, reps: "10-12" },
      { exId: "ex_db_inc_curl", sets: 3, reps: "10-12" }
    ]
  },
  {
    id: "routine_lower_b",
    category: "Hypertrophy Track (4 Days)",
    name: "Lower Body (Hamstrings & Glutes Focus)",
    description: "Targeting posterior chain through heavy RDLs, hack squats, and Bulgarian split squats.",
    exercises: [
      { exId: "ex_rdl_bb", sets: 4, reps: "6-8" },
      { exId: "ex_hack_squat", sets: 3, reps: "8-10" },
      { exId: "ex_bulgarian_split_squat", sets: 3, reps: "8-12" },
      { exId: "ex_lying_leg_curl", sets: 3, reps: "10-12" },
      { exId: "ex_seated_calf_raise", sets: 4, reps: "12-15" }
    ]
  },
  {
    id: "routine_ppl_push",
    category: "Advanced Volume (6 Days PPL)",
    name: "Push (Chest, Shoulders, Triceps)",
    description: "Complete pushing workout targeting flat & incline pressing and tricep lockouts.",
    exercises: [
      { exId: "ex_bb_bench", sets: 4, reps: "6-8" },
      { exId: "ex_db_inc_bench", sets: 3, reps: "8-10" },
      { exId: "ex_bb_ohp", sets: 3, reps: "8-10" },
      { exId: "ex_cable_lateral_raise", sets: 4, reps: "12-15" },
      { exId: "ex_tricep_rope_pushdown", sets: 3, reps: "10-12" },
      { exId: "ex_cable_overhead_ext", sets: 3, reps: "10-15" }
    ]
  },
  {
    id: "routine_ppl_pull",
    category: "Advanced Volume (6 Days PPL)",
    name: "Pull (Back, Rear Delts, Biceps)",
    description: "Maximum lat engagement through pulldowns, heavy cable rows, and bicep curls.",
    exercises: [
      { exId: "ex_lat_pulldown_wide", sets: 4, reps: "8-12" },
      { exId: "ex_seated_cable_row", sets: 4, reps: "8-12" },
      { exId: "ex_db_single_row", sets: 3, reps: "8-10" },
      { exId: "ex_face_pull", sets: 4, reps: "12-15" },
      { exId: "ex_db_inc_curl", sets: 3, reps: "10-12" },
      { exId: "ex_db_hammer_curl", sets: 3, reps: "10-12" }
    ]
  },
  {
    id: "routine_ppl_legs",
    category: "Advanced Volume (6 Days PPL)",
    name: "Legs (Quads, Hamstrings, Calves)",
    description: "High-volume leg day covering back squats, Romanian deadlifts, and calf raises.",
    exercises: [
      { exId: "ex_bb_squat_high", sets: 4, reps: "6-8" },
      { exId: "ex_rdl_bb", sets: 4, reps: "8-10" },
      { exId: "ex_leg_press", sets: 3, reps: "10-12" },
      { exId: "ex_seated_leg_curl", sets: 3, reps: "10-15" },
      { exId: "ex_standing_calf_raise", sets: 4, reps: "12-15" },
      { exId: "ex_hanging_leg_raise", sets: 3, reps: "10-15" }
    ]
  },
  {
    id: "routine_arnold_chest_back",
    category: "Classic Bodybuilding (Arnold 5-Day)",
    name: "Arnold: Chest & Back",
    description: "Classic antagonist workout training opposing chest and back muscles.",
    exercises: [
      { exId: "ex_bb_bench", sets: 4, reps: "8-10", isSuperset: true },
      { exId: "ex_pullups", sets: 4, reps: "8-12" },
      { exId: "ex_db_inc_bench", sets: 4, reps: "8-12", isSuperset: true },
      { exId: "ex_bb_bent_row", sets: 4, reps: "8-10" },
      { exId: "ex_db_pullover", sets: 3, reps: "10-12" }
    ]
  },
  {
    id: "routine_arnold_shoulders_arms",
    category: "Classic Bodybuilding (Arnold 5-Day)",
    name: "Arnold: Shoulders & Arms",
    description: "High-pump session targeting delts, biceps, and triceps.",
    exercises: [
      { exId: "ex_bb_ohp", sets: 4, reps: "8-10" },
      { exId: "ex_db_lateral_raise", sets: 4, reps: "12-15" },
      { exId: "ex_rev_pec_deck", sets: 3, reps: "12-15" },
      { exId: "ex_bb_curl", sets: 4, reps: "8-12", isSuperset: true },
      { exId: "ex_skull_crushers_ez", sets: 4, reps: "8-12" },
      { exId: "ex_db_hammer_curl", sets: 3, reps: "10-12", isSuperset: true },
      { exId: "ex_tricep_rope_pushdown", sets: 3, reps: "10-12" }
    ]
  },
  {
    id: "routine_arnold_legs",
    category: "Classic Bodybuilding (Arnold 5-Day)",
    name: "Arnold: Legs & Core",
    description: "Heavy squats, stiff-leg deadlifts, leg extensions, and standing calf raises.",
    exercises: [
      { exId: "ex_bb_squat_high", sets: 4, reps: "6-10" },
      { exId: "ex_stiff_deadlift", sets: 4, reps: "8-10" },
      { exId: "ex_leg_extension", sets: 4, reps: "12-15" },
      { exId: "ex_lying_leg_curl", sets: 4, reps: "10-12" },
      { exId: "ex_standing_calf_raise", sets: 5, reps: "12-15" }
    ]
  },
  {
    id: "routine_home_db_a",
    category: "Home & Minimal Equipment (Dumbbells Only)",
    name: "Dumbbells Only: Upper Body",
    description: "Complete upper body session using only a pair of dumbbells and a bench/floor.",
    exercises: [
      { exId: "ex_db_bench", sets: 4, reps: "8-12" },
      { exId: "ex_db_single_row", sets: 4, reps: "8-12" },
      { exId: "ex_db_shoulder_press", sets: 3, reps: "8-12" },
      { exId: "ex_db_lateral_raise", sets: 4, reps: "12-15" },
      { exId: "ex_db_curl", sets: 3, reps: "10-12" },
      { exId: "ex_pushups", sets: 3, reps: "10-15" }
    ]
  },
  {
    id: "routine_home_db_b",
    category: "Home & Minimal Equipment (Dumbbells Only)",
    name: "Dumbbells Only: Lower Body & Core",
    description: "Target legs, glutes, and abs at home with dumbbell squats, RDLs, and lunges.",
    exercises: [
      { exId: "ex_goblet_squat", sets: 4, reps: "10-12" },
      { exId: "ex_rdl_db", sets: 4, reps: "8-12" },
      { exId: "ex_bulgarian_split_squat", sets: 3, reps: "8-10" },
      { exId: "ex_single_db_calf", sets: 4, reps: "12-15" },
      { exId: "ex_plank", sets: 3, reps: "45-60s" }
    ]
  }
];

// --- 25 MOVEMENT-PATTERN BIOMECHANICAL GUIDES ---
function getExerciseGuide(exId) {
  const ex = DEFAULT_EXERCISES.find(e => e.id === exId) || (typeof getExercise === "function" ? getExercise(exId) : null);
  const name = ex ? ex.name.toLowerCase() : "";
  const primary = ex ? ex.primary : "Other";

  if (name.includes("squeeze") || name.includes("hex press")) {
    return {
      setup: "Hold dumbbells together over your chest with palms facing each other, actively squeezing the dumbbells inward against each other throughout.",
      cue: "Lower to your sternum while maintaining maximum inward squeeze pressure, then press up focusing entirely on inner chest contraction.",
      mistake: "Letting the dumbbells separate or drift apart during the rep."
    };
  }
  if (name.includes("fly") || name.includes("pec deck") || name.includes("crossover")) {
    return {
      setup: "Set pulleys or seat at mid-chest level, retract shoulder blades, and keep a soft 15° bend in your elbows.",
      cue: "Sweep your arms in a wide hugging arc, squeezing your inner chest hard at peak contraction for 1 second.",
      mistake: "Bending elbows too much (turning the fly into a press) or letting shoulders roll forward."
    };
  }
  if (name.includes("pullover") || name.includes("prayer") || name.includes("straight-arm")) {
    return {
      setup: "Brace your core to keep ribs down and maintain a fixed, soft bend in your elbows.",
      cue: "Pull the weight in an arc from overhead down toward your hips by driving with your lats and upper chest.",
      mistake: "Bending and straightening elbows (turning it into a tricep extension) or flaring the lower back."
    };
  }
  if (name.includes("incline") && (name.includes("press") || name.includes("bench"))) {
    return {
      setup: "Set bench to 30–45° incline. Tuck shoulder blades down and plant feet firmly on the floor.",
      cue: "Lower the weight to your upper chest (just below the collarbone) with elbows at ~45°, then press straight up.",
      mistake: "Setting the bench too steep (60°+), which shifts the load from upper chest to front delts."
    };
  }
  if (name.includes("dip") || name.includes("push-up")) {
    return {
      setup: "Brace abs & glutes rigid. Lean torso slightly forward (for chest) or stay upright (for triceps).",
      cue: "Lower under control until shoulders are slightly below elbows, then press to full lockout.",
      mistake: "Shrugging shoulders up toward your ears or cutting depth to half-reps."
    };
  }
  if (primary === "Chest") {
    return {
      setup: "Retract shoulder blades into the bench, create a stable upper-back base, and plant feet flat.",
      cue: "Lower with control to the mid/lower chest with elbows tucked 45–65°, then drive powerfully to lockout.",
      mistake: "Flaring elbows out at 90° or bouncing the weight off the chest."
    };
  }
  if ((name.includes("deadlift") && !name.includes("romanian") && !name.includes("stiff") && !name.includes("rdl")) || name.includes("rack pull")) {
    return {
      setup: "Stand with bar over mid-foot (1 inch from shins), grip just outside knees, chest proud and spine neutral.",
      cue: "Take a deep breath, pull the slack out of the bar, and push the floor away while dragging the bar up your legs.",
      mistake: "Rounding the lower back or letting the bar drift forward away from your shins."
    };
  }
  if (name.includes("pulldown") || name.includes("pull-up") || name.includes("chin-up")) {
    return {
      setup: "Depress your shoulder blades down away from your ears before bending your elbows.",
      cue: "Drive your elbows down toward your front pockets while keeping your chest lifted to meet the bar.",
      mistake: "Using excessive backward torso swing or pulling mostly with the biceps."
    };
  }
  if (name.includes("shrug")) {
    return {
      setup: "Stand tall with arms fully straight, leaning forward 5° with chin slightly tucked.",
      cue: "Elevate your shoulders straight up toward your ears and hold the peak squeeze for 1 full second.",
      mistake: "Rolling the shoulders in circles or bending the elbows during the shrug."
    };
  }
  if (primary === "Back") {
    return {
      setup: "Brace your core, maintain a flat neutral spine, and let the weight protract your shoulder blades at the stretch.",
      cue: "Pull your elbows back past your torso toward your hips, squeezing your mid-back at peak contraction.",
      mistake: "Jerking the torso upright with momentum or curling the wrists."
    };
  }
  if (name.includes("face pull") || name.includes("rear delt") || name.includes("reverse pec")) {
    return {
      setup: "Set cables/handles at upper-chest to eye height and keep shoulders relaxed down away from ears.",
      cue: "Sweep elbows wide and back (externally rotating thumbs backward on face pulls) to isolate the rear delts.",
      mistake: "Pinching shoulder blades together with heavy weight using mid-traps instead of rear delts."
    };
  }
  if (name.includes("raise") || name.includes("upright row")) {
    return {
      setup: "Stand stable with a slight lean forward (5–10°) and a soft fixed bend in your elbows.",
      cue: "Raise arms out in the scapular plane (30° forward) until elbows reach shoulder height.",
      mistake: "Shrugging the upper traps or swinging the hips to heave heavy weights."
    };
  }
  if (primary === "Shoulders") {
    return {
      setup: "Set hands just outside shoulder width, tuck elbows slightly forward (30°), and brace glutes/core.",
      cue: "Press vertically overhead to full lockout without excessive lower-back arch.",
      mistake: "Cutting range of motion short above the ears or flaring ribs."
    };
  }
  if (name.includes("preacher") || name.includes("spider") || name.includes("concentration")) {
    return {
      setup: "Lock your triceps firmly against the pad so your shoulder joint cannot move.",
      cue: "Curl smoothly to the top and lower over 2–3 seconds, stopping just shy of violent elbow hyperextension.",
      mistake: "Lifting your elbows off the pad or dropping the weight uncontrolled at the bottom."
    };
  }
  if (name.includes("hammer") || name.includes("reverse")) {
    return {
      setup: "Keep palms facing each other (neutral grip) or facing down (reverse grip) with elbows pinned at sides.",
      cue: "Curl the weight up targeting the brachialis and forearms without swinging your torso.",
      mistake: "Driving the elbows forward or using body momentum."
    };
  }
  if (primary === "Biceps") {
    return {
      setup: "Stand tall (or lean back on incline) with upper arms locked perpendicular to the floor.",
      cue: "Supinate (turn pinkies up) as you curl, squeeze hard at the top, and control the 2-second stretch.",
      mistake: "Swinging the lower back or letting elbows drift forward to assist the lift."
    };
  }
  if (name.includes("overhead") || name.includes("skull") || name.includes("jm press") || name.includes("tate")) {
    return {
      setup: "Point elbows upward/forward at a fixed angle to place the long head of the triceps under stretch.",
      cue: "Lower the weight behind your head/forehead until forearms pass 90°, then extend to lockout.",
      mistake: "Letting elbows flare wide open or moving the upper arms like a pullover."
    };
  }
  if (primary === "Triceps") {
    return {
      setup: "Take a small step back, hinge slightly at the hips, and pin your elbows tightly to your ribs.",
      cue: "Extend your forearms down until elbows are completely straight, spreading the rope apart at the bottom.",
      mistake: "Letting elbows ride forward and upward on every rep."
    };
  }
  if (name.includes("extension") && primary === "Quads") {
    return {
      setup: "Adjust the back pad so the knee joint aligns directly with the machine's pivot point.",
      cue: "Pull toes slightly up (dorsiflex) and extend legs to full straightness, pausing 1 second at the top.",
      mistake: "Kicking the weight up explosively and letting the stack slam down."
    };
  }
  if (name.includes("lunge") || name.includes("split squat") || name.includes("step-up")) {
    return {
      setup: "Take a hip-width stance (like standing on train tracks, not a tightrope) for balance.",
      cue: "Lower under control driving through the front mid-foot/heel, keeping 80% of weight on the working leg.",
      mistake: "Pushing off the back leg excessively or letting the front knee collapse inward."
    };
  }
  if (name.includes("leg press") || name.includes("hack squat") || name.includes("pendulum")) {
    return {
      setup: "Lock your lower back and glutes flat against the pad; place feet shoulder-width on the sled.",
      cue: "Lower the sled as deep as possible while keeping your tailbone glued to the pad, then drive up without locking knees.",
      mistake: "Letting your lower back curl off the pad at the bottom or placing hands on knees."
    };
  }
  if (primary === "Quads") {
    return {
      setup: "Set feet shoulder-width apart with toes turned out 15–30°. Take a 360° core breath and brace hard.",
      cue: "Sit down between your heels keeping chest up and knees tracking over toes until thighs break parallel.",
      mistake: "Letting hips shoot up faster than the chest or allowing knees to cave inward."
    };
  }
  if (name.includes("curl") && primary === "Hamstrings") {
    return {
      setup: "Align knee joint with the machine pivot and lock the thigh/hip pad tightly down.",
      cue: "Curl the pad all the way to your glutes/calves, pause 1 second, and resist the 2-second lowering phase.",
      mistake: "Lifting your hips off the pad to jerk the weight up."
    };
  }
  if (primary === "Hamstrings") {
    return {
      setup: "Stand tall with a soft 15° bend in your knees and brace your core to lock your spine flat.",
      cue: "Push your hips straight backward (hip hinge) while keeping the weight skimming down your thighs until hamstrings are fully stretched.",
      mistake: "Lowering the bar by bending the lower back instead of pushing the hips back."
    };
  }
  if (primary === "Glutes") {
    return {
      setup: "Tuck your chin slightly and keep ribs down; position feet so shins are vertical at the top.",
      cue: "Drive through your heels to full hip extension and hold a hard 1-second glute squeeze at the top.",
      mistake: "Arching the lower back instead of extending through the hip joint."
    };
  }
  if (primary === "Calves") {
    return {
      setup: "Place balls of your feet on the platform edge and keep knees straight (or bent 90° for seated).",
      cue: "Hold a 2-second deep stretch at the bottom, then press all the way up onto your big toes and pause 1 second.",
      mistake: "Bouncing rapidly at the bottom using Achilles tendon recoil instead of calf muscle."
    };
  }
  if (primary === "Core") {
    return {
      setup: "Exhale slightly to pull ribs down toward your pelvis and engage your deep transverse abs.",
      cue: "Focus on curling your ribcage toward your pelvis on crunches (or holding rigid anti-rotation tension on holds) with zero momentum.",
      mistake: "Pulling on your neck or swinging the legs using hip flexors."
    };
  }

  return {
    setup: "Grip evenly and set a braced, stable posture before starting the set.",
    cue: "Move through a full range of motion with a controlled 2-second lowering phase.",
    mistake: "Using momentum or cutting the stretch short."
  };
}