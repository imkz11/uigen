import { anthropic } from "@ai-sdk/anthropic";

const MODEL = "claude-haiku-4-5";

type V2StreamPart =
  | { type: "stream-start"; warnings: [] }
  | { type: "text-start"; id: string }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "text-end"; id: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; input: string }
  | { type: "finish"; finishReason: string; usage: { inputTokens: number; outputTokens: number; totalTokens: number } };

type V2Message = { role: string; content: any };

export class MockLanguageModel {
  readonly specificationVersion = "v2" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly supportedUrls: Record<string, RegExp[]> = {};

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: V2Message[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          return content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text)
            .join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private async *generateMockStream(
    messages: V2Message[],
    userPrompt: string
  ): AsyncGenerator<V2StreamPart> {
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    yield { type: "stream-start", warnings: [] };

    if (toolMessageCount === 0) {
      const text = `This is a static response. Place an Anthropic API key in the .env file to use real AI generation. Let me create an App.jsx file to display the component.`;
      const textId = "text_1";
      yield { type: "text-start", id: textId };
      for (const char of text) {
        yield { type: "text-delta", id: textId, delta: char };
        await this.delay(15);
      }
      yield { type: "text-end", id: textId };
      yield {
        type: "tool-call",
        toolCallId: "call_3",
        toolName: "str_replace_editor",
        input: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 } };
      return;
    }

    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      const textId = "text_2";
      yield { type: "text-start", id: textId };
      for (const char of text) {
        yield { type: "text-delta", id: textId, delta: char };
        await this.delay(25);
      }
      yield { type: "text-end", id: textId };
      yield {
        type: "tool-call",
        toolCallId: "call_1",
        toolName: "str_replace_editor",
        input: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 } };
      return;
    }

    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      const textId = "text_3";
      yield { type: "text-start", id: textId };
      for (const char of text) {
        yield { type: "text-delta", id: textId, delta: char };
        await this.delay(25);
      }
      yield { type: "text-end", id: textId };
      yield {
        type: "tool-call",
        toolCallId: "call_2",
        toolName: "str_replace_editor",
        input: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 } };
      return;
    }

    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:\n\n1. **${componentName}.jsx** - A fully-featured ${componentType} component\n2. **App.jsx** - The main app file that displays the component\n\nThe component is now ready to use. You can see the preview on the right side of the screen.`;
      const textId = "text_4";
      yield { type: "text-start", id: textId };
      for (const char of text) {
        yield { type: "text-delta", id: textId, delta: char };
        await this.delay(30);
      }
      yield { type: "text-end", id: textId };
      yield { type: "finish", finishReason: "stop", usage: { inputTokens: 50, outputTokens: 50, totalTokens: 100 } };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
          <textarea id="message" name="message" value={formData.message} onChange={handleChange} required rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors">Send Message</button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({ title = "Welcome to Our Service", description = "Discover amazing features and capabilities.", imageUrl, actions }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {imageUrl && <img src={imageUrl} alt={title} className="w-full h-48 object-cover" />}
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{description}</p>
        {actions && <div className="mt-4">{actions}</div>}
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Counter</h2>
      <div className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">{count}</div>
      <div className="flex gap-4">
        <button onClick={() => setCount(count - 1)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">Decrease</button>
        <button onClick={() => setCount(0)} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">Reset</button>
        <button onClick={() => setCount(count + 1)} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">Increase</button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form": return "    console.log('Form submitted:', formData);";
      case "card": return '      <div className="p-6">';
      default: return "  const increment = () => setCount(count + 1);";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form": return "    console.log('Form submitted:', formData);\n    alert('Thank you! We\\'ll get back to you soon.');";
      case "card": return '      <div className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">';
      default: return "  const increment = () => setCount(prev => prev + 1);";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Card
          title="Amazing Product"
          description="This is a fantastic product that will change your life."
          actions={<button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">Learn More</button>}
        />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <${componentName} />
      </div>
    </div>
  );
}`;
  }

  async doGenerate(options: { prompt: V2Message[] }) {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const parts: V2StreamPart[] = [];
    for await (const part of this.generateMockStream(options.prompt, userPrompt)) {
      parts.push(part);
    }

    const content: any[] = [];
    const textSegments: Record<string, string> = {};
    for (const part of parts) {
      if (part.type === "text-start") textSegments[part.id] = "";
      else if (part.type === "text-delta") textSegments[part.id] = (textSegments[part.id] ?? "") + part.delta;
    }
    for (const text of Object.values(textSegments)) {
      if (text) content.push({ type: "text", text });
    }
    for (const part of parts) {
      if (part.type === "tool-call") {
        content.push({ type: "tool-call", toolCallId: part.toolCallId, toolName: part.toolName, input: part.input });
      }
    }

    const finishPart = parts.find((p) => p.type === "finish") as any;
    return {
      content,
      finishReason: finishPart?.finishReason ?? "stop",
      usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      warnings: [],
    };
  }

  async doStream(options: { prompt: V2Message[] }) {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of self.generateMockStream(options.prompt, userPrompt)) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return { stream, warnings: [] };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0");
  }

  return anthropic(MODEL);
}
