"""
AI Catalyst Analysis Engine:
Uses the Google Gemini API (with LangChain / google-genai) to evaluate breaking financial news
and quarterly earnings reports, predicting price direction, conviction score, and structured trade setups.
Includes an institutional quantitative rule-based fallback engine for resilient offline execution.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from trade_engine import calculate_trade_parameters
from stock_universe import get_stock_info

logger = logging.getLogger("AIAnalyzer")

class TradeRecommendation(BaseModel):
    ticker: str
    display_ticker: str
    company_name: str
    market: Literal["India", "US"]
    exchange: str
    currency: str
    direction: Literal["BUY", "SELL"]
    timeframe: Literal["Intraday", "Short-term"]
    catalyst_type: str = Field(description="e.g. Earnings Beat, Major Contract/Order, Guidance Upgrade, FDA/Regulatory")
    catalyst_score: int = Field(ge=0, le=100, description="Conviction score 0 to 100")
    confidence: Literal["High Conviction", "Moderate", "Speculative"]
    reason: str = Field(description="Concise 1-2 sentence executive explanation of the catalyst")
    headline: str
    source: str
    published_at: str
    current_price: float
    entry_price: float
    stop_loss_price: float
    target_price: float
    risk_pct: float
    projected_roi_pct: float
    risk_reward_ratio: str
    volume_surge: float = 1.8
    financials: Optional[Dict[str, Any]] = None

def _clean_json_response(text: str) -> str:
    """Removes markdown code fences from LLM responses."""
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

def analyze_catalyst_with_gemini(
    stock_info: Dict[str, Any],
    quote: Dict[str, Any],
    catalyst_data: Dict[str, Any]
) -> Optional[TradeRecommendation]:
    """
    Calls the Google Gemini API to analyze the catalyst and return a structured TradeRecommendation.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        logger.info("GEMINI_API_KEY not set. Using institutional quantitative heuristic engine.")
        return None

    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        prompt = f"""
You are an institutional Wall Street and Dalal Street derivatives and quantitative equity research analyst.
Analyze the following breaking news / earnings catalyst for {stock_info['name']} ({stock_info['display_ticker']}, Market: {stock_info['market']}).

Current Market Quote:
- Price: {quote['currency']}{quote['current_price']}
- Day Change: {quote['day_change_pct']}%
- Relative Volume (RVOL): {quote['rvol']}x

Catalyst Details:
- Headline: {catalyst_data.get('headline')}
- Type: {catalyst_data.get('catalyst_type')}
- Source: {catalyst_data.get('source')}
- Financial Disclosures: {json.dumps(catalyst_data.get('financials', {}))}
- Summary: {catalyst_data.get('summary')}

Determine:
1. Direction: "BUY" (positive momentum/growth) or "SELL" (adverse impact/margin collapse).
2. Timeframe: "Intraday" (expecting 2% to 6% immediate day move) or "Short-term" (expecting 10% to 50% multi-week post-earnings drift or structural re-rating).
3. Catalyst Score: 0 to 100 (conviction score).
4. Confidence: "High Conviction" (score >= 88), "Moderate" (score 75-87), or "Speculative" (score < 75).
5. Reason: Concise, authoritative 1-2 sentence explanation of why this catalyst creates an asymmetric risk/reward move.

Return STRICTLY valid JSON matching this schema:
{{
  "direction": "BUY" or "SELL",
  "timeframe": "Intraday" or "Short-term",
  "catalyst_score": 92,
  "confidence": "High Conviction",
  "reason": "..."
}}
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        if response and response.text:
            cleaned_text = _clean_json_response(response.text)
            parsed = json.loads(cleaned_text)

            direction = parsed.get("direction", "BUY").upper()
            if direction not in ["BUY", "SELL"]:
                direction = "BUY"
            
            timeframe = parsed.get("timeframe", "Short-term").capitalize()
            if timeframe not in ["Intraday", "Short-term"]:
                timeframe = "Short-term"

            score = int(parsed.get("catalyst_score", 85))
            confidence = parsed.get("confidence", "High Conviction")
            reason = parsed.get("reason", catalyst_data.get("summary", "Strong catalyst momentum."))

            # Compute quantitative trade levels
            trade_params = calculate_trade_parameters(
                current_price=quote["current_price"],
                direction=direction,
                timeframe=timeframe,
                catalyst_strength=score,
                volatility_factor=quote.get("rvol", 1.2)
            )

            return TradeRecommendation(
                ticker=stock_info["ticker"],
                display_ticker=stock_info["display_ticker"],
                company_name=stock_info["name"],
                market=stock_info["market"],
                exchange=stock_info["exchange"],
                currency=stock_info["currency"],
                direction=direction,
                timeframe=timeframe,
                catalyst_type=catalyst_data.get("catalyst_type", "Earnings Beat"),
                catalyst_score=score,
                confidence=confidence,
                reason=reason,
                headline=catalyst_data.get("headline", ""),
                source=catalyst_data.get("source", "Market News"),
                published_at=catalyst_data.get("published_at", "Today"),
                current_price=trade_params["current_price"],
                entry_price=trade_params["entry_price"],
                stop_loss_price=trade_params["stop_loss_price"],
                target_price=trade_params["target_price"],
                risk_pct=trade_params["risk_pct"],
                projected_roi_pct=trade_params["projected_roi_pct"],
                risk_reward_ratio=trade_params["risk_reward_ratio"],
                volume_surge=quote.get("rvol", 1.8),
                financials=catalyst_data.get("financials", {})
            )

    except Exception as e:
        logger.warning(f"Gemini API analysis failed or threw exception: {e}. Falling back to quantitative engine.")
        return None

def analyze_catalyst_heuristic(
    stock_info: Dict[str, Any],
    quote: Dict[str, Any],
    catalyst_data: Dict[str, Any]
) -> TradeRecommendation:
    """
    Deterministic quantitative heuristic engine:
    Evaluates news headlines, financial surprises, and relative volume to formulate
    disciplined, institutional-grade trade parameters without requiring external API tokens.
    """
    direction: Literal["BUY", "SELL"] = "BUY"
    headline = catalyst_data.get("headline", "").lower()
    
    # Bearish signal detection
    bearish_keywords = ["miss", "drops", "slumps", "fraud", "penalty", "investigation", "downgrade", "cut", "loss", "warning"]
    if any(bw in headline for bw in bearish_keywords) and not any(pw in headline for pw in ["beats", "recovers", "cleared"]):
        direction = "SELL"

    # Timeframe selection based on catalyst nature
    # Contracts, FDA approvals, and big PAT beats offer multi-week post-announcement drift (PEAD)
    timeframe: Literal["Intraday", "Short-term"] = catalyst_data.get("timeframe", "Short-term")
    if "guidance" in headline or "orders" in headline or "beats" in headline or "jumps" in headline or "surges" in headline:
        timeframe = catalyst_data.get("timeframe", "Short-term")
    
    score = int(catalyst_data.get("catalyst_strength", 86))
    if score >= 90:
        confidence = "High Conviction"
    elif score >= 80:
        confidence = "Moderate"
    else:
        confidence = "Speculative"

    # Trade level calculations
    trade_params = calculate_trade_parameters(
        current_price=quote["current_price"],
        direction=direction,
        timeframe=timeframe,
        catalyst_strength=score,
        volatility_factor=quote.get("rvol", 1.5)
    )

    reason = catalyst_data.get("summary") or f"{catalyst_data.get('catalyst_type')} catalyst driving strong institutional order flow and volume breakout."

    return TradeRecommendation(
        ticker=stock_info["ticker"],
        display_ticker=stock_info["display_ticker"],
        company_name=stock_info["name"],
        market=stock_info["market"],
        exchange=stock_info["exchange"],
        currency=stock_info["currency"],
        direction=direction,
        timeframe=timeframe,
        catalyst_type=catalyst_data.get("catalyst_type", "Earnings Beat"),
        catalyst_score=score,
        confidence=confidence,
        reason=reason,
        headline=catalyst_data.get("headline", ""),
        source=catalyst_data.get("source", "Financial News"),
        published_at=catalyst_data.get("published_at", "Today"),
        current_price=trade_params["current_price"],
        entry_price=trade_params["entry_price"],
        stop_loss_price=trade_params["stop_loss_price"],
        target_price=trade_params["target_price"],
        risk_pct=trade_params["risk_pct"],
        projected_roi_pct=trade_params["projected_roi_pct"],
        risk_reward_ratio=trade_params["risk_reward_ratio"],
        volume_surge=quote.get("rvol", 1.8),
        financials=catalyst_data.get("financials", {})
    )

def evaluate_stock_catalyst(
    symbol: str,
    catalyst_data: Optional[Dict[str, Any]] = None,
    quote_data: Optional[Dict[str, Any]] = None
) -> TradeRecommendation:
    """
    Main entry point: fetches quote and analyzes catalyst with Gemini (with fallback).
    """
    from data_ingestion import fetch_live_quote
    stock_info = get_stock_info(symbol)
    quote = quote_data or fetch_live_quote(stock_info["ticker"])

    if not catalyst_data:
        # Default generic catalyst if none passed
        catalyst_data = {
            "headline": f"{stock_info['name']} shows strong accumulation with rising volume and sector rotation",
            "catalyst_type": "Breakout News",
            "source": "Market Wire",
            "published_at": "Today",
            "catalyst_strength": 82,
            "timeframe": "Intraday",
            "summary": "Technical breakout accompanied by above-average institutional volume surge."
        }

    # Attempt Gemini LLM analysis first
    recommendation = analyze_catalyst_with_gemini(stock_info, quote, catalyst_data)
    if not recommendation:
        # Fall back to quantitative heuristic engine
        recommendation = analyze_catalyst_heuristic(stock_info, quote, catalyst_data)

    return recommendation
