/**
 * LLM Service - Multi-provider AI service for conversation handling
 * Supports OpenAI, Anthropic Claude, and Google Gemini
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type LLMProvider = "openai" | "anthropic" | "gemini";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface LLMResponse {
  message: string;
  toolCalls?: ToolCall[];
}

export class LLMService {
  private provider: LLMProvider;
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private gemini?: GoogleGenerativeAI;

  constructor(provider: LLMProvider = "anthropic") {
    this.provider = provider;

    switch (provider) {
      case "anthropic":
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error("ANTHROPIC_API_KEY is not set");
        }
        this.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        break;

      case "openai":
        if (!process.env.OPENAI_API_KEY) {
          throw new Error("OPENAI_API_KEY is not set");
        }
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        break;

      case "gemini":
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("GEMINI_API_KEY is not set");
        }
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        break;
    }
  }

  async run(
    messages: Message[],
    tools?: any[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    switch (this.provider) {
      case "anthropic":
        return this.runAnthropic(messages, tools, systemPrompt);
      case "openai":
        return this.runOpenAI(messages, tools, systemPrompt);
      case "gemini":
        return this.runGemini(messages, tools, systemPrompt);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  private async runAnthropic(
    messages: Message[],
    tools?: any[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    if (!this.anthropic) {
      throw new Error("Anthropic client not initialized");
    }

    // Filter out system messages and use them in system parameter
    const userMessages = messages.filter((m) => m.role !== "system");
    const systemMessages = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const finalSystemPrompt = systemPrompt || systemMessages;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: finalSystemPrompt,
        messages: userMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        tools: tools,
      });

      const textContent = response.content.find((c: any) => c.type === "text");
      const toolCalls: ToolCall[] = response.content
        .filter((c: any) => c.type === "tool_use")
        .map((c: any) => ({
          name: c.name,
          arguments: c.input,
        }));

      return {
        message: textContent ? (textContent as any).text : "",
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error) {
      console.error("Anthropic API error:", error);
      throw error;
    }
  }

  private async runOpenAI(
    messages: Message[],
    tools?: any[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }

    // Add system prompt as first message if provided
    const finalMessages = [...messages];
    if (systemPrompt) {
      finalMessages.unshift({ role: "system", content: systemPrompt });
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: finalMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        tools: tools?.map((t) => ({
          type: "function" as const,
          function: t,
        })),
      });

      const message = response.choices[0]?.message;
      const toolCalls: ToolCall[] =
        message.tool_calls?.map((tc) => ({
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })) || [];

      return {
        message: message.content || "",
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw error;
    }
  }

  private async runGemini(
    messages: Message[],
    tools?: any[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    if (!this.gemini) {
      throw new Error("Gemini client not initialized");
    }

    try {
      const model = this.gemini.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        systemInstruction: systemPrompt,
      });

      // Convert messages to Gemini format
      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const lastMessage = messages[messages.length - 1];

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;

      // Extract tool calls if any
      const toolCalls: ToolCall[] = [];
      const functionCalls = (response as any).functionCalls?.();
      if (functionCalls) {
        for (const call of functionCalls) {
          toolCalls.push({
            name: call.name,
            arguments: call.args,
          });
        }
      }

      return {
        message: response.text(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error) {
      console.error("Gemini API error:", error);
      throw error;
    }
  }
}

// Get LLM service instance based on environment or config
export function getLLMService(provider?: LLMProvider): LLMService {
  const selectedProvider =
    provider ||
    (process.env.LLM_PROVIDER as LLMProvider) ||
    "anthropic";
  return new LLMService(selectedProvider);
}
