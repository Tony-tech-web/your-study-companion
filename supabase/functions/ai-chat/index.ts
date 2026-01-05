import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELS: Record<string, string> = {
  "gemini-flash": "google/gemini-2.5-flash",
  "gemini-pro": "google/gemini-2.5-pro",
  "gpt-5": "openai/gpt-5",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model = "gemini-flash", pdfContext, mode = "chat" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const selectedModel = MODELS[model] || MODELS["gemini-flash"];

    let systemPrompt = `You are Elizade AI, an intelligent study assistant for university students at Elizade University. Your role is to:

1. Help students understand complex academic concepts across all subjects
2. Provide clear, concise explanations with examples
3. Break down difficult topics into manageable parts
4. Offer study tips and learning strategies
5. Help with problem-solving and critical thinking
6. Summarize materials and create study notes
7. Answer questions about various academic subjects

Guidelines:
- Be encouraging and supportive
- Use simple language when explaining complex topics
- Provide step-by-step explanations when needed
- Include relevant examples to illustrate concepts
- Encourage students to think critically
- Be respectful and professional

Remember: You're here to help students learn and succeed in their academic journey.`;

    // Add PDF context if provided
    if (pdfContext) {
      systemPrompt += `\n\n--- UPLOADED PDF CONTENT ---\nThe student has uploaded the following PDF document for study. Use this content to help them learn:\n\n${pdfContext}\n\n--- END OF PDF CONTENT ---`;
      
      if (mode === "teach") {
        systemPrompt += `\n\nYou are now in TEACHING MODE. Your task is to:
1. Actively teach the student about the content from their uploaded PDF
2. Break down complex concepts into digestible parts
3. Ask the student questions to check their understanding
4. Provide examples and analogies to clarify difficult topics
5. Encourage the student to ask questions
6. Be patient and thorough in your explanations
7. Use the Socratic method to guide learning`;
      } else if (mode === "test") {
        systemPrompt += `\n\nYou are now in TEST MODE. Your task is to:
1. Generate ONE question at a time based on the PDF content
2. Wait for the student's answer before providing feedback
3. Evaluate their answer and explain if they got it right or wrong
4. Provide the correct answer with explanation if they were wrong
5. Then ask the next question
6. Mix question types: multiple choice, short answer, true/false, fill-in-the-blank
7. Cover different parts of the document
8. Keep track of their score mentally and encourage them
9. Start by asking: "Ready for your first question? Here it is:"`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
