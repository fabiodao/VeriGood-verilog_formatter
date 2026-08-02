# VeriGood - Verilog 格式化器

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/FabioOliveira.verigood-verilog-formatter?label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=FabioOliveira.verigood-verilog-formatter)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/FabioOliveira.verigood-verilog-formatter?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=FabioOliveira.verigood-verilog-formatter)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **[English README](README.md)**

一个功能强大的 VS Code Verilog/SystemVerilog 代码格式化器，提供**细粒度控制**每个格式化功能。与其他强制特定风格的格式化器不同，VeriGood 让您可以独立启用或禁用每个功能。

## 为什么选择 VeriGood？

- **细粒度控制** - 只启用您想要的功能
- **生产就绪** - 能处理复杂的实际 RTL 代码，包括 `ifdef`、多行表达式和嵌套连接
- **UVM 测试平台支持** - 自动检测并为 UVM/SystemVerilog 测试平台提供独立格式化
- **非破坏性** - 在提高可读性的同时保留您的代码结构
- **选择格式化** - 只格式化您选择的代码，而不是整个文件
- **零配置** - 开箱即用，具有合理的默认设置

## 功能特性

### 模块头格式化
自动对齐模块声明中的端口和参数：

```verilog
// 格式化前
module my_module #(
parameter WIDTH=8,
parameter DEPTH = 16
)(
input wire clk,
input wire [WIDTH-1:0] data_in,
output reg [WIDTH-1:0] data_out
);

// 格式化后
module my_module #(
  parameter WIDTH = 8 ,
  parameter DEPTH = 16
  )
  (
  input  wire             clk     ,
  input  wire [WIDTH-1:0] data_in ,
  output reg  [WIDTH-1:0] data_out
  );
```

### 赋值对齐
对齐连续赋值语句的运算符以提高可读性，同时保持分号紧靠右侧：

```verilog
// 格式化前
assign data_out = data_in;
assign valid = enable & ready;
assign count_next = count + 1;

// 格式化后
assign data_out   = data_in;
assign valid      = enable & ready;
assign count_next = count + 1;
```

### Wire/Reg 声明对齐
对齐组内的信号声明：

```verilog
// 格式化前
wire [7:0] data;
wire valid;
wire [31:0] address;

// 格式化后
wire  [7:0] data   ;
wire        valid  ;
wire [31:0] address;
```

### 模块实例化格式化
格式化模块实例化，对齐端口和参数：

```verilog
// 格式化前
my_fifo #(
  .DEPTH(16),
  .WIDTH(8)
  ) u_fifo (
  .clk(clk  ),
   .data_in(din),
  .data_out(dout )
);

// 格式化后
my_fifo #(
  .DEPTH (16),
  .WIDTH (8 )
  ) u_fifo (
    .clk      (clk ),
    .data_in  (din ),
    .data_out (dout)
    );
```

### 实例化风格控制
通过三个配置选项控制模块实例化的格式化方式：

#### 展开单行模块
强制特定模块始终格式化为多行，即使是单行形式：

```json
{
  "verilogFormatter.expandSingleLineModules": ["ILF_REG", "DFF"]
}
```

```verilog
// 格式化前（单行）
ILF_REG #(.BITS(8)) u_reg (.Q(out), .D(in), .CLK(clk));

// 格式化后（展开为多行）
ILF_REG #(
  .BITS (8)
  ) u_reg (
    .Q   (out),
    .D   (in ),
    .CLK (clk)
    );
```

#### 折叠单行模块
强制特定模块始终格式化为单行：

```json
{
  "verilogFormatter.collapseSingleLineModules": ["DFF"]
}
```

```verilog
// 格式化前（多行）
DFF u_ff (
  .Q   (out),
  .D   (in ),
  .CLK (clk)
);

// 格式化后（折叠为单行）
DFF u_ff (.Q(out),.D(in),.CLK(clk));
```

#### 保持原始风格
保持原始格式化风格：单行保持单行，多行保持多行：

```json
{
  "verilogFormatter.preserveInstantiationStyle": true
}
```

```verilog
// 单行保持单行
ILF_REG #(.BITS(8)) u_reg (.Q(out), .D(in), .CLK(clk));

// 多行保持多行（带正确对齐）
DFF u_ff (
  .Q   (out),
  .D   (in ),
  .CLK (clk)
  );
```

#### 优先级顺序
当多个选项冲突时，优先级为：
1. `collapseSingleLineModules`（最高优先级）
2. `expandSingleLineModules`
3. `preserveInstantiationStyle`（最低优先级）

### 其他功能
- **Always/Initial 块缩进** - 过程块内的正确嵌套
- **Case 语句格式化** - case 项的正确缩进
- **Begin/End 强制** - 为单行 if/else/for 语句添加 begin/end
- **Ifdef 注释** - 为 `else 和 `endif 指令添加注释
- **注释对齐** - 将尾部注释对齐到指定列
- **空行控制** - 限制连续空行
- **尾随空格移除** - 清理行尾

## 安装

1. 打开 VS Code
2. 按 `Ctrl+Shift+X`（macOS 上为 `Cmd+Shift+X`）
3. 搜索 "VeriGood"
4. 点击 **安装**

或从 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=FabioOliveira.verigood-verilog-formatter) 安装。

## 使用方法

### 格式化文档
- **快捷键**：`Shift+Alt+F`（Windows/Linux）或 `Shift+Option+F`（macOS）
- **右键菜单**：右键 → "格式化文档"
- **命令面板**：`Ctrl+Shift+P` → "格式化文档"

### 格式化选择
选择要格式化的代码，然后：
- **快捷键**：`Ctrl+K Ctrl+F`（Windows/Linux）或 `Cmd+K Cmd+F`（macOS）
- **右键菜单**：右键 → "格式化选择"

**重要**：选择格式化仅根据选定的行计算对齐。这意味着：
- 分号、赋值和声明在选择范围内对齐
- 组由与文档格式化相同的规则分隔（例如，带初始化的 wire 与不带初始化的 wire 是分开的）
- 如果选择不包括所有相关声明，对齐可能与文档格式化不同
- 这是有意的 - 选择格式化不会查看选择之外的行

### 推荐快捷键绑定
将以下内容添加到 `keybindings.json` 以实现智能格式化（如果选择了文本则格式化选择，否则格式化整个文档）：

```json
{
  "key": "shift+alt+f",
  "command": "editor.action.formatDocument",
  "when": "editorTextFocus && !editorHasSelection"
},
{
  "key": "shift+alt+f",
  "command": "editor.action.formatSelection",
  "when": "editorTextFocus && editorHasSelection"
}
```

## 配置

所有设置都以 `verilogFormatter.` 为前缀，可以在 VS Code 设置中配置：

| 设置 | 默认值 | 描述 |
|------|--------|------|
| `indentSize` | `editor.tabSize` | 每个缩进级别的空格数（继承编辑器设置） |
| `maxBlankLines` | `1` | 最大连续空行数 |
| `alignPortList` | `true` | 对齐模块头中的端口 |
| `alignParameters` | `true` | 对齐模块头中的参数 |
| `alignAssignments` | `true` | 对齐连续赋值 |
| `alignWireDeclSemicolons` | `true` | 对齐 wire/reg 声明 |
| `formatModuleHeaders` | `true` | 格式化模块声明 |
| `formatModuleInstantiations` | `true` | 格式化模块实例化 |
| `indentAlwaysBlocks` | `true` | 缩进 always/initial 块 |
| `indentCaseStatements` | `true` | 缩进 case 语句 |
| `enforceBeginEnd` | `true` | 为 if/else/for 添加 begin/end |
| `annotateIfdefComments` | `true` | 注释 `else/`endif 指令 |
| `commentColumn` | `0` | 注释对齐列（0 = 禁用） |
| `lineLength` | `160` | 最大行长度指南 |
| `removeTrailingWhitespace` | `true` | 移除尾随空格 |
| `expandSingleLineModules` | `[]` | 应展开为多行格式的模块名列表 |
| `collapseSingleLineModules` | `[]` | 应折叠为单行格式的模块名列表 |
| `preserveInstantiationStyle` | `false` | 保持原始实例化风格：单行保持单行，多行保持多行 |

### 示例设置

```json
{
  "editor.tabSize": 2,
  "verilogFormatter.alignAssignments": true,
  "verilogFormatter.formatModuleHeaders": true,
  "verilogFormatter.commentColumn": 60
}
```

> **注意：** 格式化器自动使用您的 `editor.tabSize` 设置进行缩进。只有当您想要为 Verilog 文件设置不同的值时，才需要设置 `verilogFormatter.indentSize`。

## UVM 测试平台支持

VeriGood 自动检测并以不同于 RTL 代码的方式格式化 UVM/SystemVerilog 测试平台：

### 自动检测

当文件包含以下内容时，会被识别为 UVM 测试平台：
- UVM 宏（`` `uvm_component_utils``、`` `uvm_object_utils``、`` `uvm_field_*`` 等）
- UVM 基类（`extends uvm_component`、`extends uvm_test`、`extends uvm_driver` 等）
- UVM 阶段方法（`build_phase`、`run_phase`、`connect_phase` 等）
- UVM 工厂/配置调用（`uvm_config_db`、`uvm_factory` 等）

### UVM 特定格式化

UVM 格式化器与 RTL 格式化器**完全独立**，以避免冲突：

- ✅ **对齐函数/任务内的赋值** - 对连续赋值进行分组以提高可读性
- ✅ **对齐约束块** - 正确格式化带有 `==` 运算符的 `constraint` 块
- ✅ **无模块级对齐** - 不对齐 wire/reg 声明和模块级赋值
- ✅ **编辑器控制缩进** - 使用编辑器的 tab 大小设置
- ✅ **正确的类/函数/任务缩进** - 正确处理嵌套结构
- ✅ **保留函数参数** - 与 RTL 模块头不同

### 配置

```json
{
  "verilogFormatter.enableUVMFormatting": true,  // 启用自动检测（默认：true）
  "verilogFormatter.uvmLineLength": 100          // UVM 最大行长度（默认：100）
}
```

### 示例

```systemverilog
// 格式化前
class my_driver extends uvm_driver #(my_transaction);
`uvm_component_utils(my_driver)
function new(string name, uvm_component parent);
super.new(name, parent);
endfunction
task run_phase(uvm_phase phase);
forever begin
seq_item_port.get_next_item(req);
drive_transaction(req);
end
endtask
endclass

// 格式化后（正确缩进，无对齐）
class my_driver extends uvm_driver #(my_transaction);
  `uvm_component_utils(my_driver)

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  task run_phase(uvm_phase phase);
    forever begin
      seq_item_port.get_next_item(req);
      drive_transaction(req);
    end
  endtask
endclass
```

## 处理复杂代码

VeriGood 设计用于处理实际的 RTL 代码：

### Ifdef 块
保留 `ifdef/`else/`endif 结构并可选择注释它们：

```verilog
`ifdef FEATURE_A
  wire feature_signal;
`else // FEATURE_A
  wire fallback_signal;
`endif // FEATURE_A
```

### 多行表达式
正确处理跨多行的参数和端口：

```verilog
parameter P_LOOKUP_TABLE = (P_MODE == 0)
                           ? {4'h0, 4'h1, 4'h2, 4'h3}
                           : {4'hF, 4'hE, 4'hD, 4'hC}
```

### 嵌套连接
正确格式化复杂的信号连接：

```verilog
.data_out ({
  {8{1'b0}},
  data_msb,
  data_lsb
})
```

## 支持的文件类型

- `.v` - Verilog
- `.vh` - Verilog 头文件
- `.sv` - SystemVerilog
- `.svh` - SystemVerilog 头文件

## 已知限制

- 不解析完整的 Verilog 语法；使用模式匹配以提高速度
- 非常长的行（>1000 个字符）可能无法获得最佳格式化
- 某些深度嵌套的 generate 块的边缘情况

## 测试

VeriGood 包含一个包含 **12 个测试套件**的综合测试套件（每个功能区域一个），涵盖所有功能和边缘情况。

### 运行测试

在发布前或进行更改后：

```bash
npm test
```

测试套件验证：
- ✓ 模块声明和实例化
- ✓ Always 块和缩进
- ✓ Case 语句
- ✓ 多行条件（if/for/while）
- ✓ 赋值对齐
- ✓ Wire/reg 声明
- ✓ 参数和端口
- ✓ 参数对齐
- ✓ 注释和边缘情况
- ✓ 嵌套 ifdef/ifndef 块
- ✓ UVM 测试平台格式化

测试会在打包（`npm run package`）和发布（`npm run publish`）前自动运行。

测试输入位于 `tests/inputs/`，标准输出位于 `tests/expected/`。在有意更改格式化后，请检查差异并使用 `npm run test:generate` 重新生成标准输出。

## 贡献

欢迎在 [GitHub](https://github.com/fabiodao/VeriGood-verilog_formatter) 上提交问题和拉取请求。

## 许可证

MIT 许可证 - 详情请参阅 [LICENSE](LICENSE)。
