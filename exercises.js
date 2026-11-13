// ============ exercises.js : STRVEX EXERCISE DATABASE, GUIDES & CURATED SPLITS ============

const DEFAULT_EXERCISES = [
  // --- CHEST (24) ---
  { id: "ex_bb_bench", name: "Barbell Bench Press", type: "weight", equipment: "Barbell", primary: "Chest", secondary: ["Triceps", "Shoulders"] },
  { id: "ex_bb_inc_bench", name: "Incline Barbell Bench Press", type: "weight", equipment: "Barbell", primary: "Chest", secondary: ["Shoulders", "Triceps"] },
  { id: "ex_bb_dec_bench", name: "Decline Barbell Bench Press", type: "weight", equipment: "Barbell", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_db_bench", name: "Dumbbell Bench Press", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Triceps", "Shoulders"] },
  { id: "ex_db_inc_bench", name: "Incline Dumbbell Press", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Shoulders", "Triceps"] },
  { id: "ex_db_dec_bench", name: "Decline Dumbbell Press", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_mach_chest_press", name: "Machine Chest Press", type: "weight", equipment: "Machine", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_mach_inc_press", name: "Incline Machine Chest Press", type: "weight", equipment: "Machine", primary: "Chest", secondary: ["Shoulders", "Triceps"] },
  { id: "ex_smith_bench", name: "Smith Machine Bench Press", type: "weight", equipment: "Smith Machine", primary: "Chest", secondary: ["Triceps", "Shoulders"] },
  { id: "ex_smith_inc_bench", name: "Smith Machine Incline Press", type: "weight", equipment: "Smith Machine", primary: "Chest", secondary: ["Shoulders", "Triceps"] },
  { id: "ex_pec_deck", name: "Pec Deck Fly Machine", type: "weight", equipment: "Machine", primary: "Chest", secondary: ["Shoulders"] },
  { id: "ex_cable_fly_mid", name: "Cable Chest Fly (Mid Pulley)", type: "weight", equipment: "Cable", primary: "Chest", secondary: ["Shoulders"] },
  { id: "ex_cable_fly_high", name: "High-to-Low Cable Fly", type: "weight", equipment: "Cable", primary: "Chest", secondary: [] },
  { id: "ex_cable_fly_low", name: "Low-to-High Cable Fly", type: "weight", equipment: "Cable", primary: "Chest", secondary: ["Shoulders"] },
  { id: "ex_db_fly", name: "Flat Dumbbell Fly", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: [] },
  { id: "ex_db_inc_fly", name: "Incline Dumbbell Fly", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Shoulders"] },
  { id: "ex_dips_chest", name: "Chest Dips (Bodyweight)", type: "weight", equipment: "Bodyweight", primary: "Chest", secondary: ["Triceps", "Shoulders"] },
  { id: "ex_dips_weighted", name: "Weighted Chest Dips", type: "weight", equipment: "Bodyweight", primary: "Chest", secondary: ["Triceps", "Shoulders"] },
  { id: "ex_pushups", name: "Standard Push-Ups", type: "reps", equipment: "Bodyweight", primary: "Chest", secondary: ["Triceps", "Core"] },
  { id: "ex_deficit_pushups", name: "Deficit Push-Ups", type: "reps", equipment: "Bodyweight", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_diamond_pushups", name: "Diamond Push-Ups", type: "reps", equipment: "Bodyweight", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_db_pullover", name: "Dumbbell Pullover", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Back", "Triceps"] },
  { id: "ex_floor_press_bb", name: "Barbell Floor Press", type: "weight", equipment: "Barbell", primary: "Chest", secondary: ["Triceps"] },
  { id: "ex_floor_press_db", name: "Dumbbell Floor Press", type: "weight", equipment: "Dumbbell", primary: "Chest", secondary: ["Triceps"] },

  // --- BACK (25) ---
  { id: "ex_conv_deadlift", name: "Conventional Barbell Deadlift", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Hamstrings", "Glutes", "Forearms"] },
  { id: "ex_bb_bent_row", name: "Barbell Bent-Over Row", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Biceps", "Forearms"] },
  { id: "ex_pendlay_row", name: "Pendlay Barbell Row", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Biceps", "Core"] },
  { id: "ex_db_single_row", name: "Single-Arm Dumbbell Row", type: "weight", equipment: "Dumbbell", primary: "Back", secondary: ["Biceps", "Forearms"] },
  { id: "ex_db_chest_row", name: "Incline Chest-Supported DB Row", type: "weight", equipment: "Dumbbell", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_lat_pulldown_wide", name: "Lat Pulldown (Wide Grip)", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_lat_pulldown_close", name: "Lat Pulldown (Close Grip / V-Bar)", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_lat_pulldown_under", name: "Reverse-Grip Lat Pulldown", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_pullups", name: "Pull-Ups", type: "reps", equipment: "Bodyweight", primary: "Back", secondary: ["Biceps", "Core"] },
  { id: "ex_pullups_weighted", name: "Weighted Pull-Ups", type: "weight", equipment: "Bodyweight", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_chinups", name: "Chin-Ups (Underhand Grip)", type: "reps", equipment: "Bodyweight", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_seated_cable_row", name: "Seated Cable Row (Close Grip)", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Biceps", "Forearms"] },
  { id: "ex_seated_cable_row_wide", name: "Seated Cable Row (Wide Grip)", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Shoulders"] },
  { id: "ex_tbar_row", name: "T-Bar Row (Chest Supported)", type: "weight", equipment: "Machine", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_mach_lat_row", name: "Machine Seated Row", type: "weight", equipment: "Machine", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_lat_prayer", name: "Straight-Arm Cable Pulldown (Lat Prayer)", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Triceps"] },
  { id: "ex_bb_shrug", name: "Barbell Shrug", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Forearms"] },
  { id: "ex_db_shrug", name: "Dumbbell Shrug", type: "weight", equipment: "Dumbbell", primary: "Back", secondary: ["Forearms"] },
  { id: "ex_smith_shrug", name: "Smith Machine Shrug", type: "weight", equipment: "Smith Machine", primary: "Back", secondary: ["Forearms"] },
  { id: "ex_rack_pull", name: "Rack Pulls (Above Knee)", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Forearms", "Glutes"] },
  { id: "ex_trap_bar_deadlift", name: "Trap Bar Deadlift", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Quads", "Glutes", "Hamstrings"] },
  { id: "ex_hyperextension", name: "Back Extension / Hyperextension", type: "reps", equipment: "Bodyweight", primary: "Back", secondary: ["Glutes", "Hamstrings"] },
  { id: "ex_inverted_row", name: "Inverted Bodyweight Row", type: "reps", equipment: "Bodyweight", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_cable_single_lat", name: "Single-Arm Half-Kneeling Lat Pulldown", type: "weight", equipment: "Cable", primary: "Back", secondary: ["Biceps"] },
  { id: "ex_seal_row", name: "Seal Row (Barbell on Bench)", type: "weight", equipment: "Barbell", primary: "Back", secondary: ["Biceps"] },

  // --- SHOULDERS (20) ---
  { id: "ex_bb_ohp", name: "Overhead Press (Standing Military)", type: "weight", equipment: "Barbell", primary: "Shoulders", secondary: ["Triceps", "Core"] },
  { id: "ex_db_shoulder_press", name: "Seated Dumbbell Shoulder Press", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Triceps"] },
  { id: "ex_arnold_press", name: "Arnold Dumbbell Press", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Triceps"] },
  { id: "ex_mach_ohp", name: "Machine Shoulder Press", type: "weight", equipment: "Machine", primary: "Shoulders", secondary: ["Triceps"] },
  { id: "ex_smith_ohp", name: "Smith Machine Shoulder Press", type: "weight", equipment: "Smith Machine", primary: "Shoulders", secondary: ["Triceps"] },
  { id: "ex_db_lateral_raise", name: "Dumbbell Lateral Raise", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: [] },
  { id: "ex_cable_lateral_raise", name: "Single-Arm Cable Lateral Raise", type: "weight", equipment: "Cable", primary: "Shoulders", secondary: [] },
  { id: "ex_cable_cuff_lateral", name: "Behind-the-Back Cable Lateral Raise", type: "weight", equipment: "Cable", primary: "Shoulders", secondary: [] },
  { id: "ex_mach_lateral_raise", name: "Machine Lateral Raise", type: "weight", equipment: "Machine", primary: "Shoulders", secondary: [] },
  { id: "ex_db_front_raise", name: "Dumbbell Front Raise", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Chest"] },
  { id: "ex_bb_front_raise", name: "Barbell Front Raise", type: "weight", equipment: "Barbell", primary: "Shoulders", secondary: ["Chest"] },
  { id: "ex_face_pull", name: "Cable Face Pull", type: "weight", equipment: "Cable", primary: "Shoulders", secondary: ["Back"] },
  { id: "ex_rev_pec_deck", name: "Reverse Pec Deck Fly (Rear Delts)", type: "weight", equipment: "Machine", primary: "Shoulders", secondary: ["Back"] },
  { id: "ex_rear_delt_cable_fly", name: "Cross-Body Cable Rear Delt Fly", type: "weight", equipment: "Cable", primary: "Shoulders", secondary: ["Back"] },
  { id: "ex_db_rear_delt_raise", name: "Incline Prone Rear Delt DB Fly", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Back"] },
  { id: "ex_upright_row_cable", name: "Cable Upright Row", type: "weight", equipment: "Cable", primary: "Shoulders", secondary: ["Biceps", "Back"] },
  { id: "ex_upright_row_bb", name: "Barbell Upright Row", type: "weight", equipment: "Barbell", primary: "Shoulders", secondary: ["Biceps", "Back"] },
  { id: "ex_lu_raises", name: "Lu Raises (Full Lateral Raise)", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Back"] },
  { id: "ex_db_push_press", name: "Dumbbell Push Press", type: "weight", equipment: "Dumbbell", primary: "Shoulders", secondary: ["Triceps", "Quads"] },
  { id: "ex_landmine_press", name: "Landmine Single-Arm Press", type: "weight", equipment: "Barbell", primary: "Shoulders", secondary: ["Triceps", "Core"] },

  // --- BICEPS (16) ---
  { id: "ex_bb_curl", name: "Barbell Bicep Curl", type: "weight", equipment: "Barbell", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_ez_curl", name: "EZ-Bar Bicep Curl", type: "weight", equipment: "Barbell", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_db_curl", name: "Standing Dumbbell Bicep Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_db_hammer_curl", name: "Dumbbell Hammer Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_db_inc_curl", name: "Incline Dumbbell Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_preacher_curl_ez", name: "EZ-Bar Preacher Curl", type: "weight", equipment: "Barbell", primary: "Biceps", secondary: [] },
  { id: "ex_preacher_curl_mach", name: "Machine Preacher Curl", type: "weight", equipment: "Machine", primary: "Biceps", secondary: [] },
  { id: "ex_preacher_curl_db", name: "Single-Arm DB Preacher Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: [] },
  { id: "ex_cable_curl_bar", name: "Cable Bicep Curl (Straight Bar)", type: "weight", equipment: "Cable", primary: "Biceps", secondary: [] },
  { id: "ex_cable_rope_hammer", name: "Cable Rope Hammer Curl", type: "weight", equipment: "Cable", primary: "Biceps", secondary: ["Forearms"] },
  { id: "ex_concentration_curl", name: "Dumbbell Concentration Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: [] },
  { id: "ex_spider_curl", name: "Dumbbell Spider Curl", type: "weight", equipment: "Dumbbell", primary: "Biceps", secondary: [] },
  { id: "ex_bayonian_curl", name: "Behind-the-Back Cable Curl (Bayesian)", type: "weight", equipment: "Cable", primary: "Biceps", secondary: [] },
  { id: "ex_high_cable_curl", name: "Overhead Dual Cable Bicep Curl", type: "weight", equipment: "Cable", primary: "Biceps", secondary: [] },
  { id: "ex_drag_curl", name: "Barbell Drag Curl", type: "weight", equipment: "Barbell", primary: "Biceps", secondary: [] },
  { id: "ex_reverse_curl_bb", name: "Reverse-Grip Barbell Curl", type: "weight", equipment: "Barbell", primary: "Biceps", secondary: ["Forearms"] },

  // --- TRICEPS (16) ---
  { id: "ex_tricep_rope_pushdown", name: "Cable Rope Tricep Pushdown", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_tricep_bar_pushdown", name: "Cable Straight-Bar Pushdown", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_tricep_vbar_pushdown", name: "Cable V-Bar Pushdown", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_cable_overhead_ext", name: "Overhead Cable Tricep Extension", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_skull_crushers_ez", name: "EZ-Bar Skull Crushers (Lying Ext)", type: "weight", equipment: "Barbell", primary: "Triceps", secondary: [] },
  { id: "ex_skull_crushers_db", name: "Dumbbell Skull Crushers", type: "weight", equipment: "Dumbbell", primary: "Triceps", secondary: [] },
  { id: "ex_db_overhead_ext", name: "Seated Dumbbell Overhead Extension", type: "weight", equipment: "Dumbbell", primary: "Triceps", secondary: [] },
  { id: "ex_single_cable_pushdown", name: "Single-Arm Cable Pushdown", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_cross_cable_ext", name: "Dual Cable Cross-Body Tricep Extension", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },
  { id: "ex_close_grip_bench", name: "Close-Grip Barbell Bench Press", type: "weight", equipment: "Barbell", primary: "Triceps", secondary: ["Chest", "Shoulders"] },
  { id: "ex_dips_triceps", name: "Parallel Bar Dips (Upright)", type: "weight", equipment: "Bodyweight", primary: "Triceps", secondary: ["Chest", "Shoulders"] },
  { id: "ex_bench_dips", name: "Bench Dips", type: "reps", equipment: "Bodyweight", primary: "Triceps", secondary: ["Chest"] },
  { id: "ex_jm_press", name: "JM Press (Barbell)", type: "weight", equipment: "Barbell", primary: "Triceps", secondary: ["Chest"] },
  { id: "ex_tate_press", name: "Dumbbell Tate Press", type: "weight", equipment: "Dumbbell", primary: "Triceps", secondary: [] },
  { id: "ex_kickbacks_db", name: "Dumbbell Tricep Kickback", type: "weight", equipment: "Dumbbell", primary: "Triceps", secondary: [] },
  { id: "ex_kickbacks_cable", name: "Cable Tricep Kickback", type: "weight", equipment: "Cable", primary: "Triceps", secondary: [] },

  // --- FOREARMS (7) ---
  { id: "ex_bb_wrist_curl", name: "Barbell Palms-Up Wrist Curl", type: "weight", equipment: "Barbell", primary: "Forearms", secondary: [] },
  { id: "ex_bb_rev_wrist_curl", name: "Barbell Palms-Down Wrist Curl", type: "weight", equipment: "Barbell", primary: "Forearms", secondary: [] },
  { id: "ex_db_wrist_curl", name: "Dumbbell Wrist Curl", type: "weight", equipment: "Dumbbell", primary: "Forearms", secondary: [] },
  { id: "ex_farmers_walk", name: "Dumbbell Farmer's Walk", type: "weight", equipment: "Dumbbell", primary: "Forearms", secondary: ["Back", "Core"] },
  { id: "ex_dead_hang", name: "Dead Hang from Pull-Up Bar", type: "time", equipment: "Bodyweight", primary: "Forearms", secondary: ["Back"] },
  { id: "ex_plate_pinch", name: "Weight Plate Pinch Hold", type: "time", equipment: "Barbell", primary: "Forearms", secondary: [] },
  { id: "ex_wrist_roller", name: "Wrist Roller Forearm Curl", type: "weight", equipment: "Machine", primary: "Forearms", secondary: [] },

  // --- QUADS (18) ---
  { id: "ex_bb_squat_high", name: "Barbell Back Squat (High Bar)", type: "weight", equipment: "Barbell", primary: "Quads", secondary: ["Glutes", "Core"] },
  { id: "ex_bb_squat_low", name: "Barbell Back Squat (Low Bar)", type: "weight", equipment: "Barbell", primary: "Quads", secondary: ["Glutes", "Hamstrings"] },
  { id: "ex_bb_front_squat", name: "Barbell Front Squat", type: "weight", equipment: "Barbell", primary: "Quads", secondary: ["Core", "Glutes"] },
  { id: "ex_leg_press", name: "Incline 45° Leg Press", type: "weight", equipment: "Machine", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_hack_squat", name: "Hack Squat Machine", type: "weight", equipment: "Machine", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_pendulum_squat", name: "Pendulum Squat Machine", type: "weight", equipment: "Machine", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_bulgarian_split_squat", name: "Bulgarian Split Squat", type: "weight", equipment: "Dumbbell", primary: "Quads", secondary: ["Glutes", "Hamstrings"] },
  { id: "ex_walking_lunges_db", name: "Dumbbell Walking Lunges", type: "weight", equipment: "Dumbbell", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_reverse_lunge_bb", name: "Barbell Reverse Lunge", type: "weight", equipment: "Barbell", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_goblet_squat", name: "Dumbbell Goblet Squat", type: "weight", equipment: "Dumbbell", primary: "Quads", secondary: ["Core"] },
  { id: "ex_leg_extension", name: "Leg Extension Machine", type: "weight", equipment: "Machine", primary: "Quads", secondary: [] },
  { id: "ex_single_leg_ext", name: "Single-Leg Extension Machine", type: "weight", equipment: "Machine", primary: "Quads", secondary: [] },
  { id: "ex_sissy_squat", name: "Sissy Squat (Bodyweight)", type: "reps", equipment: "Bodyweight", primary: "Quads", secondary: [] },
  { id: "ex_smith_squat", name: "Smith Machine Squat", type: "weight", equipment: "Smith Machine", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_step_ups", name: "Dumbbell Box Step-Ups", type: "weight", equipment: "Dumbbell", primary: "Quads", secondary: ["Glutes"] },
  { id: "ex_zercher_squat", name: "Zercher Squat", type: "weight", equipment: "Barbell", primary: "Quads", secondary: ["Core", "Back"] },
  { id: "ex_wall_sit", name: "Wall Sit Isometric Hold", type: "time", equipment: "Bodyweight", primary: "Quads", secondary: [] },
  { id: "ex_bodyweight_squat", name: "Bodyweight Air Squats", type: "reps", equipment: "Bodyweight", primary: "Quads", secondary: ["Glutes"] },

  // --- HAMSTRINGS (14) ---
  { id: "ex_rdl_bb", name: "Barbell Romanian Deadlift (RDL)", type: "weight", equipment: "Barbell", primary: "Hamstrings", secondary: ["Glutes", "Back"] },
  { id: "ex_rdl_db", name: "Dumbbell Romanian Deadlift (RDL)", type: "weight", equipment: "Dumbbell", primary: "Hamstrings", secondary: ["Glutes", "Back"] },
  { id: "ex_stiff_deadlift", name: "Stiff-Legged Barbell Deadlift", type: "weight", equipment: "Barbell", primary: "Hamstrings", secondary: ["Back", "Glutes"] },
  { id: "ex_lying_leg_curl", name: "Lying Leg Curl Machine", type: "weight", equipment: "Machine", primary: "Hamstrings", secondary: ["Calves"] },
  { id: "ex_seated_leg_curl", name: "Seated Leg Curl Machine", type: "weight", equipment: "Machine", primary: "Hamstrings", secondary: [] },
  { id: "ex_standing_leg_curl", name: "Single-Leg Standing Curl Machine", type: "weight", equipment: "Machine", primary: "Hamstrings", secondary: [] },
  { id: "ex_good_mornings", name: "Barbell Good Mornings", type: "weight", equipment: "Barbell", primary: "Hamstrings", secondary: ["Back", "Glutes"] },
  { id: "ex_nordic_curl", name: "Nordic Hamstring Curl", type: "reps", equipment: "Bodyweight", primary: "Hamstrings", secondary: ["Glutes"] },
  { id: "ex_glute_ham_raise", name: "Glute-Ham Developer Raise (GHD)", type: "reps", equipment: "Bodyweight", primary: "Hamstrings", secondary: ["Glutes", "Back"] },
  { id: "ex_single_leg_rdl_db", name: "Single-Leg Dumbbell RDL", type: "weight", equipment: "Dumbbell", primary: "Hamstrings", secondary: ["Glutes"] },
  { id: "ex_swiss_ball_curl", name: "Stability Ball Leg Curl", type: "reps", equipment: "Bodyweight", primary: "Hamstrings", secondary: ["Glutes"] },
  { id: "ex_cable_leg_curl", name: "Standing Cable Leg Curl", type: "weight", equipment: "Cable", primary: "Hamstrings", secondary: [] },
  { id: "ex_def_rdl", name: "Deficit Romanian Deadlift", type: "weight", equipment: "Barbell", primary: "Hamstrings", secondary: ["Glutes"] },
  { id: "ex_smith_rdl", name: "Smith Machine Romanian Deadlift", type: "weight", equipment: "Smith Machine", primary: "Hamstrings", secondary: ["Glutes"] },

  // --- GLUTES (10) ---
  { id: "ex_hip_thrust_bb", name: "Barbell Hip Thrust", type: "weight", equipment: "Barbell", primary: "Glutes", secondary: ["Hamstrings"] },
  { id: "ex_hip_thrust_db", name: "Dumbbell Hip Thrust", type: "weight", equipment: "Dumbbell", primary: "Glutes", secondary: ["Hamstrings"] },
  { id: "ex_hip_thrust_mach", name: "Machine Hip Thrust", type: "weight", equipment: "Machine", primary: "Glutes", secondary: ["Hamstrings"] },
  { id: "ex_glute_kickback_cable", name: "Cable Glute Kickback", type: "weight", equipment: "Cable", primary: "Glutes", secondary: [] },
  { id: "ex_abductor_mach", name: "Hip Abductor Machine", type: "weight", equipment: "Machine", primary: "Glutes", secondary: [] },
  { id: "ex_sumo_deadlift", name: "Sumo Deadlift", type: "weight", equipment: "Barbell", primary: "Glutes", secondary: ["Hamstrings", "Quads", "Back"] },
  { id: "ex_cable_pull_through", name: "Cable Pull-Through", type: "weight", equipment: "Cable", primary: "Glutes", secondary: ["Hamstrings"] },
  { id: "ex_frog_pumps", name: "Dumbbell Frog Pumps", type: "weight", equipment: "Dumbbell", primary: "Glutes", secondary: [] },
  { id: "ex_glute_bridge_single", name: "Single-Leg Glute Bridge", type: "reps", equipment: "Bodyweight", primary: "Glutes", secondary: ["Hamstrings"] },
  { id: "ex_cable_curtsy_lunge", name: "Cable Curtsy Lunge", type: "weight", equipment: "Cable", primary: "Glutes", secondary: ["Quads"] },

  // --- CALVES (8) ---
  { id: "ex_standing_calf_raise", name: "Standing Machine Calf Raise", type: "weight", equipment: "Machine", primary: "Calves", secondary: [] },
  { id: "ex_seated_calf_raise", name: "Seated Machine Calf Raise", type: "weight", equipment: "Machine", primary: "Calves", secondary: [] },
  { id: "ex_leg_press_calf", name: "Leg Press Calf Extension", type: "weight", equipment: "Machine", primary: "Calves", secondary: [] },
  { id: "ex_single_db_calf", name: "Single-Leg Dumbbell Calf Raise", type: "weight", equipment: "Dumbbell", primary: "Calves", secondary: [] },
  { id: "ex_smith_calf_raise", name: "Smith Machine Calf Raise", type: "weight", equipment: "Smith Machine", primary: "Calves", secondary: [] },
  { id: "ex_donkey_calf_raise", name: "Donkey Calf Raise Machine", type: "weight", equipment: "Machine", primary: "Calves", secondary: [] },
  { id: "ex_bb_calf_raise", name: "Standing Barbell Calf Raise", type: "weight", equipment: "Barbell", primary: "Calves", secondary: [] },
  { id: "ex_tibialis_raise", name: "Tibialis Shin Raise (Bodyweight)", type: "reps", equipment: "Bodyweight", primary: "Calves", secondary: [] },

  // --- CORE (14) ---
  { id: "ex_hanging_leg_raise", name: "Hanging Leg Raise (Toes to Bar)", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: ["Forearms"] },
  { id: "ex_hanging_knee_raise", name: "Hanging Knee Raise", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_cable_crunch", name: "Kneeling Cable Crunch", type: "weight", equipment: "Cable", primary: "Core", secondary: [] },
  { id: "ex_ab_wheel", name: "Ab Wheel Rollout", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: ["Back", "Shoulders"] },
  { id: "ex_woodchoppers", name: "Cable Woodchoppers", type: "weight", equipment: "Cable", primary: "Core", secondary: [] },
  { id: "ex_plank", name: "Standard Isometric Plank", type: "time", equipment: "Bodyweight", primary: "Core", secondary: ["Shoulders"] },
  { id: "ex_side_plank", name: "Side Plank", type: "time", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_decline_crunch", name: "Decline Bench Weighted Crunch", type: "weight", equipment: "Dumbbell", primary: "Core", secondary: [] },
  { id: "ex_captains_chair", name: "Captain's Chair Leg Raise", type: "reps", equipment: "Machine", primary: "Core", secondary: [] },
  { id: "ex_pallof_press", name: "Cable Pallof Press", type: "weight", equipment: "Cable", primary: "Core", secondary: [] },
  { id: "ex_russian_twist", name: "Weighted Russian Twist", type: "weight", equipment: "Dumbbell", primary: "Core", secondary: [] },
  { id: "ex_dragon_flag", name: "Dragon Flag", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: ["Back"] },
  { id: "ex_deadbug", name: "Deadbug (Bodyweight)", type: "reps", equipment: "Bodyweight", primary: "Core", secondary: [] },
  { id: "ex_vacuum", name: "Stomach Vacuum Hold", type: "time", equipment: "Bodyweight", primary: "Core", secondary: [] }
];

// --- 5 CURATED ROUTINE SPLITS (With Complete 3-Day Beginner & Target Rep Ranges) ---
const CURATED_ROUTINES = [
  // 1. Beginner Track (3 Days/Week — Complete Day 1, Day 2, Day 3)
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
      { exId: "ex_plank", sets: 2, reps: "45-60s" }
    ]
  },

  // 2. Upper / Lower Split (4 Days/Week)
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

  // 3. Advanced 6-Day Split (Push / Pull / Legs)
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

  // 4. Classic 5-Day Arnold Split
  {
    id: "routine_arnold_chest_back",
    category: "Classic Bodybuilding (Arnold 5-Day)",
    name: "Arnold: Chest & Back",
    description: "Classic antagonist workout training opposing chest and back muscles.",
    exercises: [
      { exId: "ex_bb_bench", sets: 4, reps: "8-10" },
      { exId: "ex_pullups", sets: 4, reps: "8-12" },
      { exId: "ex_db_inc_bench", sets: 4, reps: "8-12" },
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
      { exId: "ex_bb_curl", sets: 4, reps: "8-12" },
      { exId: "ex_skull_crushers_ez", sets: 4, reps: "8-12" },
      { exId: "ex_db_hammer_curl", sets: 3, reps: "10-12" },
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

  // 5. Minimal Equipment Track (Dumbbells Only)
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

// --- BUILT-IN EXERCISE EXECUTION GUIDES (Zero-MB Offline Form Coaching) ---
const SPECIFIC_GUIDES = {
  ex_bb_bench: {
    setup: "Lie flat with eyes under the bar. Pull shoulder blades together and plant feet firmly on the floor.",
    cue: "Lower the bar with control to your lower chest with elbows at a 45-70° angle, then press up and slightly back.",
    mistake: "Flaring elbows straight out at 90° or bouncing the bar off the ribcage."
  },
  ex_conv_deadlift: {
    setup: "Stand with feet hip-width apart, bar over mid-foot (1 inch from shins). Grip just outside legs.",
    cue: "Brace your core hard, pull the slack out of the bar, and push the floor away while keeping the bar dragging up your legs.",
    mistake: "Rounding the lower back or letting the bar drift forward away from the shins."
  },
  ex_bb_squat_high: {
    setup: "Rest the bar on your upper traps, grip narrow, feet shoulder-width apart with toes turned out 15-30°.",
    cue: "Take a deep belly breath, brace your core, and sit down between your heels until thighs are at least parallel.",
    mistake: "Letting knees cave inward or lifting heels off the floor."
  },
  ex_bb_ohp: {
    setup: "Grip the bar just outside shoulder width at collarbone height. Squeeze glutes and abs tight.",
    cue: "Press the bar straight overhead, moving your head slightly back to clear the chin, then tuck head under at lockout.",
    mistake: "Excessively leaning back and turning the overhead press into a standing incline press."
  },
  ex_rdl_bb: {
    setup: "Hold the bar at hip height with a shoulder-width grip. Keep a soft 15° bend in your knees.",
    cue: "Push your hips straight back like closing a car door with your glutes until you feel a deep hamstring stretch.",
    mistake: "Bending the knees too much (turning it into a squat) or rounding the lower spine."
  },
  ex_lat_pulldown_wide: {
    setup: "Grip the bar 1.5x shoulder width and lock your thighs tightly under the knee pad.",
    cue: "Drive your elbows down toward your hips while keeping your chest slightly lifted.",
    mistake: "Swinging your torso backward using momentum or pulling the bar behind your neck."
  },
  ex_db_lateral_raise: {
    setup: "Stand tall holding dumbbells at your sides with a slight bend in your elbows, leaning forward 5-10°.",
    cue: "Raise arms out and slightly forward (in the scapular plane) until elbows reach shoulder height.",
    mistake: "Shrugging with your traps or swinging heavy weights with body momentum."
  }
};

function getExerciseGuide(exId) {
  if (SPECIFIC_GUIDES[exId]) return SPECIFIC_GUIDES[exId];
  const ex = DEFAULT_EXERCISES.find(e => e.id === exId);
  const primary = ex ? ex.primary : "Other";
  const equip = ex ? ex.equipment : "Barbell";

  const fallbacks = {
    Chest: {
      setup: "Retract your shoulder blades into the bench/pad and keep your chest proud throughout the set.",
      cue: "Control the 2-second stretch at the bottom and drive through your elbows to contract the pecs.",
      mistake: "Letting the front shoulders roll forward at the top of the press or fly."
    },
    Back: {
      setup: "Set a neutral spine, brace your core, and depress your shoulders away from your ears before pulling.",
      cue: "Lead the pull with your elbows rather than your biceps, pausing briefly at peak contraction.",
      mistake: "Using excessive lower-back swing or cutting the stretch short at the top."
    },
    Shoulders: {
      setup: "Brace your core and keep your ribcage down with a stable base.",
      cue: "Move smoothly without jerking, keeping constant tension on the deltoids.",
      mistake: "Shrugging the upper traps toward your ears as fatigue builds."
    },
    Biceps: {
      setup: "Pin your upper arms at your sides (or against the pad) with wrists firm and neutral.",
      cue: "Curl through a full range of motion, squeezing hard at the top and lowering over 2 full seconds.",
      mistake: "Swinging your hips and lower back to heave the weight up."
    },
    Triceps: {
      setup: "Lock your elbows in place so only your forearms move around the elbow joint.",
      cue: "Fully straighten the arm at lockout and control the stretch on the way back.",
      mistake: "Flaring elbows wide or using shoulder momentum to push the weight."
    },
    Quads: {
      setup: "Plant your whole foot firmly and brace your core before starting the descent.",
      cue: "Control the lowering phase for 2-3 seconds, tracking your knees in line with your toes.",
      mistake: "Bouncing out of the bottom or cutting depth short as the set gets hard."
    },
    Hamstrings: {
      setup: "Brace your abs and maintain a flat, neutral spine or locked pelvis against the pad.",
      cue: "Feel a full stretch in the hamstrings before contracting smoothly without jerking.",
      mistake: "Arching the lower back or letting the hips lift off the pad during curls."
    },
    Glutes: {
      setup: "Tuck your chin slightly and keep your ribs down with shins vertical at peak contraction.",
      cue: "Drive through your heels and squeeze the glutes hard for 1 second at the top.",
      mistake: "Hyperextending the lower back instead of extending through the hips."
    },
    Calves: {
      setup: "Place the balls of your feet securely on the edge of the platform with knees straight (or bent for seated).",
      cue: "Pause 1 full second in the bottom stretch and 1 second at the very top on your tiptoes.",
      mistake: "Bouncing rapidly out of the bottom using Achilles tendon recoil."
    },
    Core: {
      setup: "Exhale slightly to pull your ribs down toward your pelvis and flatten your lower back.",
      cue: "Focus on curling the spine (or resisting movement) using abdominal tension rather than hip flexors.",
      mistake: "Pulling on your neck or letting your lower back arch off the floor."
    }
  };

  return fallbacks[primary] || {
    setup: "Set a stable posture and grip the " + equip.toLowerCase() + " evenly.",
    cue: "Use a controlled 2-second lowering phase and full range of motion.",
    mistake: "Using momentum instead of controlled muscular tension."
  };
}
