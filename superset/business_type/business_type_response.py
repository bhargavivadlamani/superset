"""
A docstring
"""

from typing import Any, List, Literal, Optional, TypedDict

from superset.utils.core import FilterStringOperators


class BusinessTypeResponse(TypedDict, total=False):
    """
    A docstring
    """

    error_message: Optional[str]
    values: List[Any]  # parsed value (can be any value)
    display_value: str  # The string representation of the parsed vlaues
    valid_filter_operators: List[FilterStringOperators]
