module test_instantiations;


// Test 1: Simple instance on single line
simple_module u_simple(
  );

// Test 2: Instance with parameters and ports - unformatted
complex_module #(
  .WIDTH (8 ),
  .DEPTH (16)
  )
  u_complex(
    .clk  (clk ),
    .data (data)
    );

// Test 3: Instance with multi-line parameter values
memory #(
  .INIT_VAL ({32'h0, 32'hFF})
  )
  u_mem(
    .clk (clk)
    );

// Test 4: Instance with ifdef
cpu #(
  `ifdef FAST_MODE
  .SPEED (100),
  `else // FAST_MODE
  .SPEED (50 ),
  `endif // FAST_MODE
  .WIDTH (32 )
  )
  u_cpu(
    .clk  (clk ),
    .data (data)
    );

// Test 5: Multiple instances
fifo u_fifo1(
  );
fifo u_fifo2(
  );

// Test 6: Instance with mixed short and long port names
controller u_ctrl(
  .clk           (system_clock),
  .rst_n         (reset_n     ),
  .enable_signal (en          ),
  .data          (d           )
  );

endmodule
