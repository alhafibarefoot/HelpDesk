using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace HelpDesk.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
        // Mapster configuration would go here if specialized

        return services;
    }
}
