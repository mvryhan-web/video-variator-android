import sympy as sp


def solve_expression(expression):

    try:

        x = sp.symbols("x")

        result = sp.integrate(expression, x)

        return str(result)

    except Exception as e:

        return str(e)