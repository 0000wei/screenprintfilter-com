#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { convertToHalftone } from './halftone.js';
import fs from 'fs/promises';

// Create MCP server
const server = new Server(
  {
    name: 'screenprintfilter-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'convert_halftone',
        description: 'Convert an image to halftone dot pattern for screen printing. All processing happens locally on your machine - no network calls. Supports various dot shapes, sizes, spacing, contrast, brightness adjustments, and color options.',
        inputSchema: {
          type: 'object',
          properties: {
            input_path: {
              type: 'string',
              description: 'Path to the input image file (JPG, PNG, WebP, etc.)'
            },
            output_path: {
              type: 'string',
              description: 'Path where the output PNG will be saved'
            },
            dot_size: {
              type: 'number',
              description: 'Maximum dot diameter in pixels (2-30). Default: 4',
              minimum: 2,
              maximum: 30,
              default: 4
            },
            spacing: {
              type: 'number',
              description: 'Dot spacing multiplier (1.0-2.0). 1.0 = tight spacing, 2.0 = spread out. Default: 1.0',
              minimum: 1.0,
              maximum: 2.0,
              default: 1.0
            },
            contrast: {
              type: 'number',
              description: 'Contrast adjustment percentage (0-100). Default: 50',
              minimum: 0,
              maximum: 100,
              default: 50
            },
            brightness: {
              type: 'number',
              description: 'Brightness adjustment (-50 to +50). Default: 0',
              minimum: -50,
              maximum: 50,
              default: 0
            },
            shape: {
              type: 'string',
              description: 'Dot shape. Default: circle',
              enum: ['circle', 'square', 'diamond', 'line'],
              default: 'circle'
            },
            angle: {
              type: 'number',
              description: 'Rotation angle of the dot grid in degrees (0-360). Default: 0',
              minimum: 0,
              maximum: 360,
              default: 0
            },
            fg_color: {
              type: 'string',
              description: 'Foreground color (hex format, e.g., #000000). Only used when use_original_colors is false. Default: #000000',
              default: '#000000'
            },
            bg_color: {
              type: 'string',
              description: 'Background color (hex format, e.g., #FFFFFF). Default: #FFFFFF',
              default: '#FFFFFF'
            },
            use_original_colors: {
              type: 'boolean',
              description: 'Whether to preserve the original image colors. If true, fg_color is ignored. Default: true',
              default: true
            },
            output_width: {
              type: 'number',
              description: 'Custom output width in pixels. If null, uses original image width. Default: null',
              default: null
            },
            output_height: {
              type: 'number',
              description: 'Custom output height in pixels. If null, uses original image height. Default: null',
              default: null
            }
          },
          required: ['input_path', 'output_path']
        }
      }
    ]
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'convert_halftone') {
    try {
      // Validate required parameters
      const { input_path, output_path } = args;

      if (!input_path || !output_path) {
        throw new Error('Missing required parameters: input_path and output_path are required');
      }

      // Check if input file exists
      try {
        await fs.access(input_path);
      } catch (error) {
        throw new Error(`Input file not found: ${input_path}`);
      }

      // Build parameters object
      const params = {
        dotSize: args.dot_size ?? 4,
        spacing: args.spacing ?? 1.0,
        contrast: args.contrast ?? 50,
        brightness: args.brightness ?? 0,
        shape: args.shape ?? 'circle',
        angle: args.angle ?? 0,
        fgColor: args.fg_color ?? '#000000',
        bgColor: args.bg_color ?? '#FFFFFF',
        useOriginalColors: args.use_original_colors ?? true,
        outputWidth: args.output_width ?? null,
        outputHeight: args.output_height ?? null
      };

      // Convert the image
      await convertToHalftone(input_path, output_path, params);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully converted ${input_path} to halftone and saved to ${output_path}\n\nParameters used:\n- Dot size: ${params.dotSize}px\n- Spacing: ${params.spacing}x\n- Contrast: ${params.contrast}%\n- Brightness: ${params.brightness}\n- Shape: ${params.shape}\n- Angle: ${params.angle}°\n- Original colors: ${params.useOriginalColors ? 'enabled' : 'disabled'}\n- Output dimensions: ${params.outputWidth ? params.outputWidth + 'x' + params.outputHeight : 'original size'}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error converting image to halftone: ${error.message}`
          }
        ],
        isError: true
      };
    }
  } else {
    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${name}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ScreenPrintFilter MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});