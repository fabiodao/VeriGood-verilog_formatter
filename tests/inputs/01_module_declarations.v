// Test 1: Simple module with no parameters or ports
module simple_module;
endmodule

// Test 2: Module with ports on declaration line
module inline_ports(input clk, output reg data);
endmodule

// Test 3: Module with parameters - unformatted
module with_params #(
parameter WIDTH=8,
parameter DEPTH =16
)(
input clk,
output [WIDTH-1:0] data
);
endmodule

// Test 4: Module with ifdef in parameters
module ifdef_params #(
`ifdef USE_WIDE
parameter WIDTH = 32
`else
parameter WIDTH = 8
`endif
,
parameter DEPTH = 16
)(
input clk
);
endmodule

// Test 5: Module with multi-line parameter values
module multiline_param_value #(
parameter INIT_VALUE = {
32'h00000000,
32'hFFFFFFFF,
32'hAAAAAAAA
},
parameter DEPTH = 8
)(
input clk
);
endmodule

// Test 6: Module with comments in parameters
module commented_params #(
parameter WIDTH = 8, // Data width
parameter DEPTH = 16 // FIFO depth
)(
input clk // Clock input
);
endmodule

// Test 7: Empty module with just ports
module just_ports(
input wire clk,
input wire rst_n,
output reg [7:0] data_out
);
endmodule
