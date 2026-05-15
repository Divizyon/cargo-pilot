namespace CargoPilot.Application.Common.Interfaces;

public interface IErpPasswordProtector
{
    string Protect(string plainText);
    string Unprotect(string cipherText);
}
