using HelpDesk.Domain.Entities;
using Mapster;
using System.Text.Json.Serialization;

namespace HelpDesk.Application.DTOs;

public record UserDto(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("email")] string Email,
    [property: JsonPropertyName("full_name")] string FullName,
    [property: JsonPropertyName("role")] string Role,
    [property: JsonPropertyName("department")] string Department
);

public record CreateUserDto(string Email, string FullName, string Role, string Department);

public class InternalMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<User, UserDto>()
            .Map(dest => dest.Role, src => src.Role.ToString());
        config.NewConfig<CreateUserDto, User>();
    }
}
