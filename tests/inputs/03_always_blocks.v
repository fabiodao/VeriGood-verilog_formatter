module test_always;

// Test 1: Always block without begin/end (should add them)
always @(posedge clk)
data <= 1;

// Test 2: Always block with proper begin/end
always @(posedge clk) begin
data <= 1;
end

// Test 3: Combinational always with multiple statements - unformatted
always @(*) begin
a=b+c;
d=e&f;
g=h|i;
end

// Test 4: Nested always with if/else - unformatted
always @(posedge clk) begin
if (rst_n == 0) begin
counter <= 0;
end else begin
counter <= counter + 1;
end
end

// Test 5: Always with case statement inside
always @(*) begin
case (state)
IDLE: next_state = ACTIVE;
ACTIVE: next_state = IDLE;
default: next_state = IDLE;
endcase
end

// Test 6: Multiple always blocks
always @(posedge clk) begin
reg1 <= data_in;
end

always @(negedge clk) begin
reg2 <= data_out;
end

// Test 7: Always with for loop - unformatted
always @(*) begin
for (i=0; i<8; i=i+1) begin
mem[i]=0;
end
end

// Test 8: Always with deeply nested conditions
always @(*) begin
if (a) begin
if (b) begin
if (c) begin
result = 1;
end
end
end
end

endmodule
