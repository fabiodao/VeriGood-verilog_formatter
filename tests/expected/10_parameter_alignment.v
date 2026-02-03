// Test 10: Parameter Alignment in Module Instantiations
//
// CRITICAL REQUIREMENT: All closing parentheses `)` for parameters must be
// aligned at the SAME COLUMN, regardless of whether they are:
// - Single-line parameters: .PARAM(value)
// - Multiline arithmetic: .PARAM(val1 + val2 + val3)
// - Multiline concatenations: .PARAM({val1, val2, val3})
//
// The alignment column is determined by the rightmost closing position needed
// by any parameter in the instantiation.

module test_parameter_alignment;

  // Test 1: Basic case - single-line and multiline concatenation
  // Expected: Both ) should be at the same column
  basic_reg #(
    .WIDTH (8     ),
    .INIT  ({4'h0,
             4'hf})
    )
    u_basic(
      .clk (clk)
      );

  // Test 2: Three parameters with different types
  // Expected: All three ) at same column
  mixed_reg #(
    .A (1      ),
    .B (16     ),
    .C ({8'd0 ,
         8'hFF})
    )
    u_mixed(
      .clk (clk)
      );

  // Test 3: Long parameter names
  // Expected: All ) aligned despite different name lengths
  names_reg #(
    .SHORT          (1     ),
    .VERY_LONG_NAME (256   ),
    .MEDIUM         ({4'h0,
                      4'hf})
    )
    u_names(
      .clk (clk)
      );

  // Test 4: Complex realistic case
  // Expected: All ) at same column (like user's test_file.v)
  bcm_reg #(
    .TMR    (`P_SAFETY),
    .WIDTH  (8 +
             4 +
             2        ),
    .RSTVAL ({8'd0,
              4'hf,
              2'd0}   )
    )
    u_bcm(
      .clk (clk)
      );

endmodule
