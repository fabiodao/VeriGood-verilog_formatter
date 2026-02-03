module test_multiline_conditions;


// Test 1: Multi-line if condition - unformatted
always @(*) begin
  if (signal_a &&
  signal_b &&
  signal_c) begin
  result  = 1;
end
end

// Test 2: Multi-line if with operators
always @(*) begin
  if ((a > b) &&
  (c < d) ||
  (e == f)) begin
  result  = 1;
end
end

// Test 3: Multi-line if with else - unformatted
always @(*) begin
  if (enable &&
  valid &&
  ready) begin
  state   = ACTIVE;
end else begin
  state   = IDLE;
end
end

// Test 4: Multi-line else if
always @(*) begin
  if (mode == 0) begin
    output = 0;
  end else if (mode == 1 &&
  enable) begin
  output = 1;
end else begin
  output = 2;
end
end

// Test 5: Nested multi-line conditions
always @(*) begin
  if (outer_a &&
  outer_b) begin
  if (inner_a ||
  inner_b) begin
  nested_result = 1;
end
end
end

// Test 6: Multi-line for loop condition - unformatted
always @(*) begin
  for (i = 0; i < 10 &&
  i != 5 &&
  enabled; i = i + 1) begin
  data[i] = 0;
end
end

// Test 7: Multi-line while condition
always @(*) begin
  while (counter < limit &&
  !done &&
  enabled) begin
  counter = counter + 1;
end
end

// Test 8: Very long multi-line condition - unformatted
always @(*) begin
  if (very_long_signal_name_a &&
  very_long_signal_name_b &&
  very_long_signal_name_c &&
  very_long_signal_name_d &&
  very_long_signal_name_e) begin
  result = 1;
end
end

// Test 9: Multi-line condition with complex parentheses
always @(*) begin
  if ((signal_a && signal_b &&
  signal_c) ||
  (signal_d && signal_e)) begin
  output_val = 1;
end
end

// Test 10: Multi-line ternary assignment
assign result = (condition_a &&
condition_b) ?
value_true :
value_false;

endmodule
