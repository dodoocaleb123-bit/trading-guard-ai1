import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";
import { displayChatMessage } from "@/lib/chat-display";

/**
 * Message type matching server-side LLM Message interface
 */
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIChatBoxProps = {
  /**
   * Messages array to display in the chat.
   * Should match the format used by invokeLLM on the server.
   */
  messages: Message[];

  /**
   * Callback when user sends a message.
   * Typically you'll call a tRPC mutation here to invoke the LLM.
   */
  onSendMessage: (content: string) => void;

  /**
   * Whether the AI is currently generating a response
   */
  isLoading?: boolean;

  /**
   * Placeholder text for the input field
   */
  placeholder?: string;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Height of the chat box (default: 600px)
   */
  height?: string | number;

  /**
   * Empty state message to display when no messages
   */
  emptyStateMessage?: string;

  /**
   * Suggested prompts to display in empty state
   * Click to send directly
   */
  suggestedPrompts?: string[];

  /** Branded identity shown above the conversation. */
  assistantName?: string;
  assistantTagline?: string;

  /** Hide the internal identity header when a parent owns the fixed workspace header. */
  showHeader?: boolean;

  /** Small helper caption shown beneath the composer in the reference layout. */
  composerHint?: string;
};

/**
 * A ready-to-use AI chat box component that integrates with the LLM system.
 *
 * Features:
 * - Matches server-side Message interface for seamless integration
 * - Markdown rendering with Streamdown
 * - Auto-scrolls to latest message
 * - Loading states
 * - Uses global theme colors from index.css
 *
 * @example
 * ```tsx
 * const ChatPage = () => {
 *   const [messages, setMessages] = useState<Message[]>([
 *     { role: "system", content: "You are a helpful assistant." }
 *   ]);
 *
 *   const chatMutation = trpc.ai.chat.useMutation({
 *     onSuccess: (response) => {
 *       // Assuming your tRPC endpoint returns the AI response as a string
 *       setMessages(prev => [...prev, {
 *         role: "assistant",
 *         content: response
 *       }]);
 *     },
 *     onError: (error) => {
 *       console.error("Chat error:", error);
 *       // Optionally show error message to user
 *     }
 *   });
 *
 *   const handleSend = (content: string) => {
 *     const newMessages = [...messages, { role: "user", content }];
 *     setMessages(newMessages);
 *     chatMutation.mutate({ messages: newMessages });
 *   };
 *
 *   return (
 *     <AIChatBox
 *       messages={messages}
 *       onSendMessage={handleSend}
 *       isLoading={chatMutation.isPending}
 *       suggestedPrompts={[
 *         "Explain quantum computing",
 *         "Write a hello world in Python"
 *       ]}
 *     />
 *   );
 * };
 * ```
 */
export function AIChatBox({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  className,
  height = "600px",
  emptyStateMessage = "Start a conversation with AI",
  suggestedPrompts,
  assistantName = "AI assistant",
  assistantTagline = "Grounded conversation with clear paper-trading boundaries.",
  showHeader = true,
  composerHint,
}: AIChatBoxProps) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter out system messages
  const displayMessages = messages.filter((msg) => msg.role !== "system");

  // Calculate min-height for last assistant message to push user message to top
  const [minHeightForLastMessage, setMinHeightForLastMessage] = useState(0);

  useEffect(() => {
    if (containerRef.current && inputAreaRef.current) {
      const containerHeight = containerRef.current.offsetHeight;
      const inputHeight = inputAreaRef.current.offsetHeight;
      const scrollAreaHeight = containerHeight - inputHeight;

      // Reserve space for:
      // - padding (p-4 = 32px top+bottom)
      // - user message: 40px (item height) + 16px (margin-top from space-y-4) = 56px
      // Note: margin-bottom is not counted because it naturally pushes the assistant message down
      const userMessageReservedHeight = 56;
      const calculatedHeight = scrollAreaHeight - 32 - userMessageReservedHeight;

      setMinHeightForLastMessage(Math.max(0, calculatedHeight));
    }
  }, []);

  // Scroll to bottom helper function with smooth animation
  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement;

    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  };

  useEffect(() => {
    if (!displayMessages.length) return;
    requestAnimationFrame(() => {
      const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    });
  }, [displayMessages.length, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    onSendMessage(trimmedInput);
    setInput("");

    // Scroll immediately after sending
    scrollToBottom();

    // Keep focus on input
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex min-w-0 max-w-full flex-col overflow-hidden bg-card text-card-foreground rounded-lg border shadow-sm",
        className
      )}
      style={{ height }}
    >
      {showHeader && (
        <div className="flex items-center justify-between gap-3 border-b bg-background/70 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="size-4" /></div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{assistantName}</p>
              <p className="truncate text-xs text-muted-foreground">{assistantTagline}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Paper only</span>
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollAreaRef} className="min-w-0 max-w-full flex-1 overflow-hidden">
        {displayMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="max-w-[18ch] whitespace-pre-line text-[1.8rem] font-bold leading-[0.98] tracking-tight text-[#9e9e9e] sm:text-[2.35rem]">
              {emptyStateMessage}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full w-0 min-w-full max-w-full overflow-hidden">
            <div className="flex w-0 min-w-full max-w-full flex-col space-y-4 overflow-x-hidden p-4">
              {displayMessages.map((message, index) => {
                // Apply min-height to last message only if NOT loading (when loading, the loading indicator gets it)
                const isLastMessage = index === displayMessages.length - 1;
                const shouldApplyMinHeight =
                  isLastMessage && !isLoading && minHeightForLastMessage > 0;

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex w-full min-w-0 max-w-full gap-3",
                      message.role === "user"
                        ? "justify-end items-start"
                        : "justify-start items-start"
                    )}
                    style={
                      shouldApplyMinHeight
                        ? { minHeight: `${minHeightForLastMessage}px` }
                        : undefined
                    }
                  >
                    {message.role === "assistant" && (
                      <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="size-4 text-primary" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "min-w-0 max-w-[calc(100%_-_72px)] rounded-lg px-4 py-2.5 break-words [overflow-wrap:anywhere]",
                        message.role === "user"
                          ? "bg-[#c4c4c4] text-[#282828]"
                          : "bg-[#efede5] text-[#282828]"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert w-full min-w-0 max-w-none break-words [overflow-wrap:anywhere]">
                          <Streamdown>{displayChatMessage(message.content)}</Streamdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
                          {message.content}
                        </p>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="size-8 shrink-0 mt-1 rounded-full bg-secondary flex items-center justify-center">
                        <User className="size-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div
                  className="flex w-full min-w-0 max-w-full items-start gap-3"
                  style={
                    minHeightForLastMessage > 0
                      ? { minHeight: `${minHeightForLastMessage}px` }
                      : undefined
                  }
                >
                  <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 w-fit max-w-[calc(100%_-_72px)] break-words rounded-lg bg-muted px-4 py-2.5 [overflow-wrap:anywhere]">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input Area */}
      <form
        ref={inputAreaRef}
        onSubmit={handleSubmit}
        className="flex w-full min-w-0 flex-col items-center gap-1 border-0 bg-white px-4 pb-3 pt-4"
      >
        <div className="flex w-[calc(100%-28px)] min-w-0 max-w-[914px] items-center gap-2 rounded-full bg-[#c3c3c3] px-4 py-2 sm:w-full sm:py-2.5">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
                        className="min-h-6 flex-1 resize-none border-0 bg-transparent p-0 text-sm text-[#272727] shadow-none outline-none placeholder:text-[#9e9e9e] focus-visible:ring-0 sm:min-h-8"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="size-7 shrink-0 rounded-full bg-black text-white hover:bg-black/85 disabled:bg-black disabled:text-white disabled:opacity-100 sm:size-10"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        {composerHint && <p className="w-full max-w-[230px] text-center text-[8px] leading-tight text-[#272727] sm:max-w-[914px] sm:text-[10px]">{composerHint}</p>}
      </form>
    </div>
  );
}
