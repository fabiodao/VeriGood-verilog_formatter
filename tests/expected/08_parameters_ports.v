module test_params_ports #(
  // Test 1: Parameter declarations - unaligned
  parameter WIDTH    = 8 ,
  parameter DEPTH    = 16,
  parameter INIT_VAL = 0 ,
  parameter MODE     = 1
  )
  (
  // Test 2: Port declarations - unaligned
  input                  clk     ,
  input                  rst_n   ,
  input      [WIDTH-1:0] data_in ,
  output reg [WIDTH-1:0] data_out,
  output                 valid
  );


endmodule

// Test 3: Module with localparam - unaligned
module with_localparam;

  localparam STATE_IDLE    = 0;
  localparam STATE_ACTIVE  = 1;
  localparam STATE_DONE    = 2;
  localparam COUNTER_WIDTH = 8;
endmodule

// Test 4: Module with parameter and localparam mixed
module mixed_params (
  parameter WIDTH = 8
  );

  localparam HALF_WIDTH   = WIDTH/2;
  localparam DOUBLE_WIDTH = WIDTH*2;
endmodule

// Test 5: Ports with different types - unaligned
module varied_ports (
  input  wire        clk  ,
  input  wire        rst_n,
  inout        [7:0] bidir,
  output reg         valid,
  output wire [15:0] data
  );

endmodule

// Test 6: Ports with packed arrays
module packed_ports (
  input      [7:0] [3:0] packed_in ,
  output reg [3:0] [7:0] packed_out
  );

endmodule
