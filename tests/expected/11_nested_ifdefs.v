// Test 11: Nested and Intertwined Ifdefs in Module Instantiations
//
// Tests complex ifdef/ifndef/else/endif structures within parameters and ports

module test_nested_ifdefs;

// Test 1: Nested ifdefs in parameters
complex_module #(
  .WIDTH   (32 ),
  `ifdef FEATURE_A
  .PARAM_A (100),
  `ifdef FEATURE_B
  .PARAM_B (200),
  `else // FEATURE_B
  .PARAM_B (50 ),
  `endif // FEATURE_B
  .PARAM_C (300),
  `else // FEATURE_A
  .PARAM_A (10 ),
  `endif // FEATURE_A
  .DEPTH   (64 )
  )
  u_test1(
    .clk (clk)
    );

// Test 2: Intertwined ifdefs with concatenations
register #(
  .TMR  (`SAFETY_EN),
  .INIT ({
         `ifdef MODE_A
         8'd10,
         `ifdef SUB_MODE_A1
         8'd20,
         `else // SUB_MODE_A1
         8'd25,
         `endif // SUB_MODE_A1
         `else // MODE_A
         8'd30,
         `endif // MODE_A
         8'd40
             }     )
  )
  u_test2(
    .clk (clk)
    );

// Test 3: Multiple nested levels
memory #(
  .SIZE  (
          `ifdef BIG_MEM
          `ifdef HUGE_MEM
          1024
          `else // HUGE_MEM
          512
          `endif // HUGE_MEM
          `else // BIG_MEM
          `ifdef TINY_MEM
          64
          `else // TINY_MEM
          128
          `endif // TINY_MEM
          `endif // BIG_MEM
              ),
  .WIDTH (32  )
  )
  u_test3(
    .data (data)
    );

// Test 4: Ifdef around entire parameter
processor #(
  `ifdef FEATURE_X
  .CACHE_SIZE     (256),
  `endif // FEATURE_X
  .WORD_SIZE      (32 ),
  `ifndef FEATURE_Y
  .PIPELINE_DEPTH (4  ),
  `endif // FEATURE_Y
  .REG_COUNT      (16 )
  )
  u_test4(
    .clk (clk)
    );

// Test 5: Complex intertwined with multiline expressions
calculator #(
  .PRECISION (8 +
              `ifdef HIGH_PRECISION
              16 +
              `ifdef ULTRA_PRECISION
              32 +
              `endif // ULTRA_PRECISION
              8 +
              `else // HIGH_PRECISION
              4 +
              `endif // HIGH_PRECISION
              2         ),
  .MODE      (`CALC_MODE)
  )
  u_test5(
    .result (result)
    );

// Test 6: Ifdef in ports with concatenations
controller #(
  .WIDTH (32)
  )
  u_test6(
    .data_in({
               `ifdef PORT_A
               signal_a    ,
               `endif // PORT_A
               `ifdef PORT_B
               signal_b    ,
               `ifdef PORT_B_EXT
               signal_b_ext,
               `endif // PORT_B_EXT
               `endif // PORT_B
               signal_default
                          } ),
    .clk     (clk           )
    );

// Test 7: Mixed ifdef positions
mixed_module #(
  .P1 (1     ),
  `ifdef COND_1
  .P2 (2     ),
  .P3 ({
       4'd0,
       `ifdef COND_2
       4'd1,
       4'd2,
       `endif // COND_2
       4'd3
          }  ),
  `else // COND_1
  .P2 (20    ),
  `endif // COND_1
  .P4 (4     )
  )
  u_test7(
    .clk           (clk       ),
    `ifdef PORT_COND
    .optional_port (opt_signal),
    `endif // PORT_COND
    .data          (data      )
    );

endmodule
