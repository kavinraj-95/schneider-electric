"""
Sample Python file for testing the AI Unit Test Generator.
Contains various function types to demonstrate test generation.
"""


def add_numbers(a: int, b: int) -> int:
    """Add two numbers together."""
    if a < 0 or b < 0:
        raise ValueError("Negative numbers not allowed")
    return a + b


def divide_numbers(dividend: float, divisor: float) -> float:
    """Divide two numbers."""
    if divisor == 0:
        raise ZeroDivisionError("Cannot divide by zero")
    return dividend / divisor


def process_string(text: str) -> str:
    """Process a string by converting to uppercase and trimming."""
    if text is None:
        raise TypeError("Text cannot be None")
    
    if not text:
        return ""
    
    return text.strip().upper()


def find_max(numbers: list) -> int:
    """Find maximum value in a list."""
    if not numbers:
        raise ValueError("List cannot be empty")
    
    max_val = numbers[0]
    for num in numbers:
        if num > max_val:
            max_val = num
    
    return max_val


class Calculator:
    """Simple calculator class."""
    
    def __init__(self):
        self.result = 0
    
    def add(self, value: int) -> int:
        """Add value to result."""
        if not isinstance(value, (int, float)):
            raise TypeError("Value must be a number")
        
        self.result += value
        return self.result
    
    def subtract(self, value: int) -> int:
        """Subtract value from result."""
        if not isinstance(value, (int, float)):
            raise TypeError("Value must be a number")
        
        self.result -= value
        return self.result
    
    def reset(self) -> None:
        """Reset calculator to zero."""
        self.result = 0


async def fetch_data(url: str) -> dict:
    """
    Async function to fetch data.
    (Simulated - no actual HTTP call)
    """
    if not url:
        raise ValueError("URL cannot be empty")
    
    if not url.startswith("http"):
        raise ValueError("Invalid URL format")
    
    # Simulate async operation
    return {"status": "success", "url": url}


def validate_email(email: str) -> bool:
    """Validate email format."""
    if not email or "@" not in email:
        return False
    
    parts = email.split("@")
    if len(parts) != 2:
        return False
    
    if not parts[0] or not parts[1]:
        return False
    
    return True