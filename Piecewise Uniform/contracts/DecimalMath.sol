// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;
pragma experimental ABIEncoderV2;


/// @dev Implements simple fixed point math mul and div operations for 27 decimals.
library DecimalMath {

    uint256 constant internal UNIT = 1e27;

    struct UFixed {
        uint256 value;
    }

    /// @dev Creates a fixed point number from an unsiged integer. `toUFixed(1) = 10^-27`
    /// Converting from fixed point to integer can be done with `UFixed.value / UNIT` and `UFixed.value % UNIT`
    function toUFixed(uint256 x) internal pure returns (UFixed memory) {
        return UFixed({
            value: x
        });
    }

    /// @dev Equal to.
    function eq(UFixed memory x, UFixed memory y) internal pure returns (bool) {
        return x.value == y.value;
    }

    /// @dev Equal to.
    function eq(UFixed memory x, uint y) internal pure returns (bool) {
        return x.value == y*(UNIT);
    }

    /// @dev Equal to.
    function eq(uint x, UFixed memory y) internal pure returns (bool) {
        return x*(UNIT) == y.value;
    }

    /// @dev Greater than.
    function gt(UFixed memory x, UFixed memory y) internal pure returns (bool) {
        return x.value > y.value;
    }

    /// @dev Greater than.
    function gt(UFixed memory x, uint y) internal pure returns (bool) {
        return x.value > y*(UNIT);
    }

    /// @dev Greater than.
    function gt(uint x, UFixed memory y) internal pure returns (bool) {
        return x*(UNIT) > y.value;
    }

    /// @dev Greater or equal.
    function geq(UFixed memory x, UFixed memory y) internal pure returns (bool) {
        return x.value >= y.value;
    }

    /// @dev Greater or equal.
    function geq(UFixed memory x, uint y) internal pure returns (bool) {
        return x.value >= y*(UNIT);
    }

    /// @dev Greater or equal.
    function geq(uint x, UFixed memory y) internal pure returns (bool) {
        return x*(UNIT) >= y.value;
    }

    /// @dev Less than.
    function lt(UFixed memory x, UFixed memory y) internal pure returns (bool) {
        return x.value < y.value;
    }

    /// @dev Less than.
    function lt(UFixed memory x, uint y) internal pure returns (bool) {
        return x.value < y*(UNIT);
    }

    /// @dev Less than.
    function lt(uint x, UFixed memory y) internal pure returns (bool) {
        return x*(UNIT) < y.value;
    }

    /// @dev Less or equal.
    function leq(UFixed memory x, UFixed memory y) internal pure returns (bool) {
        return x.value <= y.value;
    }

    /// @dev Less or equal.
    function leq(uint x, UFixed memory y) internal pure returns (bool) {
        return x*(UNIT) <= y.value;
    }

    /// @dev Less or equal.
    function leq(UFixed memory x, uint y) internal pure returns (bool) {
        return x.value <= y*(UNIT);
    }

    /// @dev Multiplies x and y.
    /// @param x An unsigned integer.
    /// @param y A fixed point number.
    /// @return An unsigned integer.
    function muld(uint256 x, UFixed memory y) internal pure returns (uint256) {
        return x*(y.value)/(UNIT);
    }

    /// @dev Multiplies x and y.
    /// @param x A fixed point number.
    /// @param y A fixed point number.
    /// @return A fixed point number.
    function muld(UFixed memory x, UFixed memory y) internal pure returns (UFixed memory) {
        return UFixed({
            value: muld(x.value, y)
        });
    }

    /// @dev Multiplies x and y.
    /// @param x A fixed point number.
    /// @param y An unsigned integer.
    /// @return A fixed point number.
    function muld(UFixed memory x, uint y) internal pure returns (UFixed memory) {
        return muld(x, toUFixed(y));
    }

    /// @dev Divides x by y.
    /// @param x An unsigned integer.
    /// @param y A fixed point number.
    /// @return An unsigned integer.
    function divd(uint256 x, UFixed memory y) internal pure returns (uint256) {
        return x*(UNIT)/(y.value);
    }

    /// @dev Divides x by y.
    /// @param x A fixed point number.
    /// @param y A fixed point number.
    /// @return A fixed point number.
    function divd(UFixed memory x, UFixed memory y) internal pure returns (UFixed memory) {
        return UFixed({
            value: divd(x.value, y)
        });
    }

    /// @dev Divides x by y.
    /// @param x A fixed point number.
    /// @param y An unsigned integer.
    /// @return A fixed point number.
    function divd(UFixed memory x, uint y) internal pure returns (UFixed memory) {
        return divd(x, toUFixed(y));
    }

    /// @dev Divides x by y.
    /// @param x An unsigned integer.
    /// @param y An unsigned integer.
    /// @return A fixed point number.
    function divd(uint256 x, uint256 y) internal pure returns (UFixed memory) {
        return divd(toUFixed(x), y);
    }

    /// @dev Adds x and y.
    /// @param x A fixed point number.
    /// @param y A fixed point number.
    /// @return A fixed point number.
    function addd(UFixed memory x, UFixed memory y) internal pure returns (UFixed memory) {
        return UFixed({
            value: x.value+(y.value)
        });
    }

    /// @dev Adds x and y.
    /// @param x A fixed point number.
    /// @param y An unsigned integer.
    /// @return A fixed point number.
    function addd(UFixed memory x, uint y) internal pure returns (UFixed memory) {
        return addd(x, toUFixed(y));
    }

    /// @dev Subtracts x and y.
    /// @param x A fixed point number.
    /// @param y A fixed point number.
    /// @return A fixed point number.
    function subd(UFixed memory x, UFixed memory y) internal pure returns (UFixed memory) {
        return UFixed({
            value: x.value-(y.value)
        });
    }

    /// @dev Subtracts x and y.
    /// @param x A fixed point number.
    /// @param y An unsigned integer.
    /// @return A fixed point number.
    function subd(UFixed memory x, uint y) internal pure returns (UFixed memory) {
        return subd(x, toUFixed(y));
    }

    /// @dev Subtracts x and y.
    /// @param x An unsigned integer.
    /// @param y A fixed point number.
    /// @return A fixed point number.
    function subd(uint x, UFixed memory y) internal pure returns (UFixed memory) {
        return subd(toUFixed(x), y);
    }

    /// @dev Divides x between y, rounding up to the closest representable number.
    /// @param x An unsigned integer.
    /// @param y A fixed point number.
    /// @return An unsigned integer.
    function divdrup(uint256 x, UFixed memory y) internal pure returns (uint256)
    {
        uint256 z = x*(UNIT);
        return z%y.value == 0 ? z/y.value : z/y.value+1;
    }

    /// @dev Multiplies x by y, rounding up to the closest representable number.
    /// @param x An unsigned integer.
    /// @param y A fixed point number.
    /// @return An unsigned integer.
    function muldrup(uint256 x, UFixed memory y) internal pure returns (uint256)
    {
        uint256 z = x*y.value;
        return z%UNIT == 0 ? z/UNIT : z/UNIT+1;
    }

    /// @dev Exponentiation (x**n) by squaring of a fixed point number by an integer.
    /// Taken from https://github.com/dapphub/ds-math/blob/master/src/math.sol. Thanks!
    /// @param x A fixed point number.
    /// @param n An unsigned integer.
    /// @return An unsigned integer.
    function powd(UFixed memory x, uint256 n) internal pure returns (UFixed memory) {
        if (x.value == 0) return toUFixed(0);
        if (n == 0) return toUFixed(UNIT);
        UFixed memory z = n % 2 != 0 ? x : toUFixed(UNIT);

        for (n /= 2; n != 0; n /= 2) {
            x = muld(x, x);

            if (n % 2 != 0) {
                z = muld(z, x);
            }
        }
        return z;
    }
}